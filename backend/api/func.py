import logging
import os
import re
from typing import Union
from urllib.parse import urljoin, urlparse

import bs4
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

LOGIN_URL = "https://bntu.by/user/login"
DEFAULT_AUTH_URL = "https://bntu.by/user/auth"
REQUEST_TIMEOUT_SECONDS = 30
INVALID_CREDENTIALS_MARKERS = (
    "неверный",
    "неправиль",
    "invalid",
    "incorrect",
    "auth failed",
    "ошибка авторизации",
)
AUTHENTICATED_MARKERS = (
    "logout",
    "выйти",
    "личный кабинет",
    "dashboard",
    "pay",
)
INVALID_FULLNAME_VALUES = {
    "личный кабинет",
    "кабинет",
    "dashboard",
}
INVALID_FACULTY_MARKERS = (
    "выдача",
    "договора",
    "выписки",
    "подтверждение",
    "проверке перед трудоустройством",
    "услуги",
    "персонального ментора",
    "для иностранных граждан",
    "первая ступень",
    "вторая ступень",
    "третья ступень",
    "общее высшее образование",
)
def _allow_insecure_ssl_fallback() -> bool:
    explicit_value = os.environ.get("BNTU_ALLOW_INSECURE_SSL")
    if explicit_value is not None:
        return explicit_value.lower() in {"1", "true", "yes", "on"}
    return bool(getattr(settings, "DEBUG", False))


def _extract_login_form(html: str) -> tuple[bs4.Tag | None, str | None]:
    soup = bs4.BeautifulSoup(html, "html.parser")
    forms = soup.find_all("form")

    for form in forms:
        password_input = form.find("input", attrs={"type": "password"})
        if password_input is None:
            continue

        action = form.get("action")
        return form, action

    return None, None


def _build_form_payload(form: bs4.Tag, login: str, password: str) -> dict[str, str]:
    payload: dict[str, str] = {}
    login_field_name = None
    password_field_name = "password"

    for field in form.find_all("input"):
        name = field.get("name")
        if not name:
            continue

        field_type = (field.get("type") or "text").lower()
        value = field.get("value") or ""

        if field_type in {"hidden", "submit"}:
            payload[name] = value
            continue

        if field_type == "password":
            password_field_name = name
            continue

        if login_field_name is None and field_type in {"text", "tel", "number"}:
            login_field_name = name

    payload[password_field_name] = password

    if login_field_name:
        payload[login_field_name] = login
    else:
        payload["username"] = login

    payload.setdefault("username", login)
    payload.setdefault("login", login)

    return payload


def _has_invalid_credentials(response: requests.Response) -> bool:
    content = (response.text or "").lower()
    return any(marker in content for marker in INVALID_CREDENTIALS_MARKERS)


def _is_authenticated_response(response: requests.Response, login_url: str) -> bool:
    final_url = str(response.url or "")
    final_path = urlparse(final_url).path.lower()
    login_path = urlparse(login_url).path.lower()
    content = (response.text or "").lower()

    if _has_invalid_credentials(response):
        return False

    if final_path and final_path not in {login_path, "/user/auth"} and "login" not in final_path:
        return True

    return any(marker in content for marker in AUTHENTICATED_MARKERS)


def _normalize_text(value: str) -> str:
    return " ".join((value or "").replace("\xa0", " ").split())


def _looks_like_fullname(value: str | None) -> bool:
    if not value:
        return False

    normalized = _normalize_text(value)
    if not normalized:
        return False

    lowered = normalized.lower()
    if lowered in INVALID_FULLNAME_VALUES:
        return False

    words = [word for word in normalized.split() if word]
    if len(words) < 2 or len(words) > 4:
        return False

    if any(char.isdigit() for char in normalized):
        return False

    return all(len(word) > 1 for word in words)


def _looks_like_faculty(value: str | None) -> bool:
    if not value:
        return False

    normalized = _normalize_text(value)
    if not normalized:
        return False

    lowered = normalized.lower()
    if any(marker in lowered for marker in INVALID_FACULTY_MARKERS):
        return False

    if len(normalized) > 80:
        return False

    return True


def _extract_fullname(html: str) -> str | None:
    soup = bs4.BeautifulSoup(html, "html.parser")
    page_text = soup.get_text("\n", strip=True)

    greeting_match = re.search(r"Привет,\s*([^!\n\r]+)!", page_text, flags=re.IGNORECASE)
    if greeting_match:
        greeting_name = _normalize_text(greeting_match.group(1))
        if _looks_like_fullname(greeting_name):
            return greeting_name

    fullname_element = soup.find("h1", class_="newsName")
    if fullname_element:
        text = _normalize_text(fullname_element.get_text(" ", strip=True))
        if _looks_like_fullname(text):
            return text

    selectors = [
        ("h1", {"class": "page-title"}),
        ("h1", {}),
        ("div", {"class": "dashboardInfo"}),
    ]
    for tag_name, attrs in selectors:
        element = soup.find(tag_name, attrs=attrs)
        if not element:
            continue

        text = _normalize_text(element.get_text(" ", strip=True))
        if not text:
            continue

        parts = [part.strip() for part in text.split(",") if part.strip()]
        if parts and _looks_like_fullname(parts[0]):
            return parts[0]

    return None


def _extract_faculty(html: str) -> str | None:
    soup = bs4.BeautifulSoup(html, "html.parser")
    dashboard_info = soup.find("div", class_="dashboardInfo")

    if dashboard_info:
        dashboard_lines = [
            _normalize_text(line)
            for line in dashboard_info.get_text("\n", strip=True).splitlines()
            if _normalize_text(line)
        ]

        for line in dashboard_lines:
            lowered = line.lower()
            if not any(token in lowered for token in ("образование", "курс", "кафедра")):
                continue

            parts = [part.strip() for part in line.split(",") if part.strip()]
            for part in parts:
                part_lowered = part.lower()
                if any(token in part_lowered for token in ("курс", "группа", "номер", "кафедра", "образование")):
                    continue
                if _looks_like_faculty(part):
                    return part

        text = _normalize_text(dashboard_info.get_text(" ", strip=True))
        parts = [part.strip() for part in text.split(",") if part.strip()]
        for part in parts:
            lowered = part.lower()
            if "курс" in lowered:
                continue
            if any(token in lowered for token in ("фак", "институт", "fitr", "фитр", "фиту", "энерго", "стро")):
                if _looks_like_faculty(part):
                    return part
        if len(parts) >= 3:
            fallback_part = parts[2]
            if _looks_like_faculty(fallback_part):
                return fallback_part

    text = _normalize_text(soup.get_text(" ", strip=True))
    for marker in ("Факультет", "Институт"):
        if marker not in text:
            continue
        fragment = text.split(marker, 1)[1].lstrip(": ").split("  ", 1)[0]
        if fragment:
            normalized_fragment = _normalize_text(fragment)
            if _looks_like_faculty(normalized_fragment):
                return normalized_fragment

    return None


def authorize(login: str, password: str) -> Union[bool, tuple[str, str]]:
    """
    Проверяет, является ли пользователь студентом БНТУ.
    При успехе возвращает кортеж `(fullname, faculty)`, иначе `False`.
    """
    try:
        logger.info("Запрос авторизации нового пользователя через bntu.by: %s", login)

        verification_modes = [requests.certs.where()]
        allow_insecure_ssl_fallback = _allow_insecure_ssl_fallback()
        if allow_insecure_ssl_fallback:
            verification_modes.append(False)

        response = None

        for verify_mode in verification_modes:
            session = requests.Session()
            session.verify = verify_mode
            session.headers.update(
                {
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/133.0.0.0 Safari/537.36"
                    ),
                    "Referer": LOGIN_URL,
                }
            )

            try:
                if verify_mode is False:
                    logger.warning(
                        "Retrying BNTU auth for %s with insecure SSL fallback after secure validation failed",
                        login,
                    )

                login_response = session.get(LOGIN_URL, timeout=REQUEST_TIMEOUT_SECONDS)
                login_response.raise_for_status()

                form, action = _extract_login_form(login_response.text)
                if form is None:
                    logger.warning("Не удалось найти форму входа на странице BNTU")
                    return False

                auth_url = urljoin(LOGIN_URL, action) if action else DEFAULT_AUTH_URL
                payload = _build_form_payload(form, login, password)

                response = session.post(
                    auth_url,
                    data=payload,
                    timeout=REQUEST_TIMEOUT_SECONDS,
                    allow_redirects=True,
                )
                response.raise_for_status()
                break
            except requests.exceptions.SSLError:
                if verify_mode is False:
                    raise
                if not allow_insecure_ssl_fallback:
                    logger.warning(
                        "BNTU SSL validation failed for %s and insecure fallback is disabled",
                        login,
                    )
                    return False
                logger.warning(
                    "BNTU SSL validation failed for %s, switching to insecure fallback mode",
                    login,
                )
                continue

        logger.info("Ответ BNTU после входа: %s", response.url)

        if not _is_authenticated_response(response, LOGIN_URL):
            logger.info("BNTU не подтвердил авторизацию пользователя %s", login)
            return False

        fullname = _extract_fullname(response.text)
        faculty = _extract_faculty(response.text)

        if not fullname:
            logger.warning("Не удалось извлечь ФИО после авторизации через BNTU для %s", login)
            return False

        if not faculty:
            logger.warning("Не удалось извлечь факультет после авторизации через BNTU для %s", login)
            return False

        logger.info("Авторизация нового пользователя через BNTU успешна: %s, %s", fullname, faculty)
        return fullname, faculty
    except requests.RequestException:
        logger.exception("Ошибка сети при авторизации через BNTU для %s", login)
        return False
    except Exception:
        logger.exception("Непредвиденная ошибка авторизации через BNTU для %s", login)
        return False

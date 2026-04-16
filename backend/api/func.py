import requests
import bs4
from typing import Union

def authorize(login: str, password: str) -> Union[bool, tuple[str, str]]:
    """
    Проверяет, является ли пользователь студентом
    Если студент - возвращает fullname и faculty
    Иначе возвращает False
    """
    try:
        print(f"[AUTH] Попытка авторизации с login={login}")
        
        session = requests.Session()
        session.verify = True  # Включить проверку SSL для безопасности
        session.timeout = 30  # Таймаут 30 секунд
        
        response = session.get("https://bntu.by/user/login", timeout=30)
        print(f"[AUTH] Статус страницы входа: {response.status_code}")
        content = response.text
        cookies = response.cookies
        
        soup = bs4.BeautifulSoup(content, "html.parser")
        token_element = soup.form.find("input", attrs={"name": "_token"})
        if not token_element:
            print("[AUTH] ОШИБКА: Не удалось найти CSRF токен")
            return False
            
        token = token_element["value"]
        print(f"[AUTH] Токен извлечен: {token[:20]}...")
        
        headers = {
            "cookie": f"XSRF-TOKEN={cookies.get('XSRF-TOKEN', '')}; laravel_session={cookies.get('laravel_session', '')}"
        }
        
        data = {"_token": token, "username": login, "password": password}
        
        response = session.post(
            "https://bntu.by/user/auth", headers=headers, data=data, timeout=30
        )
        content = response.text
        print(f"[AUTH] Статус ответа авторизации: {response.status_code}")
        print(f"[AUTH] URL ответа авторизации: {response.url}")
        
        if "pay" in str(response.url):
            soup = bs4.BeautifulSoup(content, "html.parser")
            fullname_element = soup.find("h1", class_="newsName")
            if not fullname_element:
                print("[AUTH] ОШИБКА: Не удалось найти элемент fullname")
                return False
                
            fullname = fullname_element.next_sibling.next_sibling.text.split(",")[1][1:-22]
            info_div = soup.find("div", class_="dashboardInfo")
            if not info_div:
                print("[AUTH] ОШИБКА: Не удалось найти div dashboardInfo")
                return False
                
            for line in info_div.contents:
                if "курс" in line:
                    _, _, faculty, *_ = line.split(",")
                    break
            faculty = faculty.replace(" ", "")
            print(f"[AUTH] Авторизация успешна: {fullname}, {faculty}")
            return fullname, faculty
        else:
            print(f"[AUTH] Авторизация не удалась: не перенаправлен на страницу оплаты")
            print(f"[AUTH] Предпросмотр содержимого ответа: {content[:500]}...")
            return False
            
    except Exception as e:
        print(f"[AUTH] Ошибка авторизации: {e}")
        return False
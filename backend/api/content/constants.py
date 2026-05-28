import re


NEWS_BASE_URL = "https://times.bntu.by"
LITERATURE_REST_BASE_URL = "https://rep.bntu.by/rest"
LITERATURE_PAGE_LIMIT = 50

LITERATURE_TOP_LEVEL_SECTIONS = {
    "БНТУ в фотографиях": "data/142374",
    "Внеуниверситетские публикации ученых БНТУ": "data/1008",
    "Выпускные квалификационные работы": "data/53531",
    "Графические работы": "data/72102",
    "Диссертации, авторефераты диссертаций": "data/53485",
    "Инструктивно-методические документы": "data/53783",
    "История БНТУ в публикациях": "data/53501",
    "Конкурсные и выставочные проекты": "data/92527",
    "Материалы конференций и семинаров": "data/95",
    "Монографии": "data/53149",
    "Отчеты о НИОКТР": "data/57",
    "Патенты": "data/56602",
    "Публикации работников Научной библиотеки": "data/54",
    "Сборники научных трудов": "data/14456",
    "Сериальные издания": "data/60",
    "Учебные материалы": "data/62",
}

LITERATURE_EXCLUDED_SECTION_HANDLES = {
    "data/142374",
    "data/53531",
    "data/72102",
    "data/53783",
    "data/95",
    "data/57",
    "data/56602",
    "data/53485",
}

LITERATURE_TOP_LEVEL_SECTIONS = {
    name: handle
    for name, handle in LITERATURE_TOP_LEVEL_SECTIONS.items()
    if handle not in LITERATURE_EXCLUDED_SECTION_HANDLES
}

LITERATURE_PER_FACULTY = {
    "atf": "https://rep.bntu.by/handle/data/101",
    "fgde": "https://rep.bntu.by/handle/data/82",
    "msf": "https://rep.bntu.by/handle/data/132",
    "mtf": "https://rep.bntu.by/handle/data/76",
    "fmmp": "https://rep.bntu.by/handle/data/86",
    "ef": "https://rep.bntu.by/handle/data/99",
    "fitr": "https://rep.bntu.by/handle/data/84",
    "ftug": "https://rep.bntu.by/handle/data/96",
    "ipf": "https://rep.bntu.by/handle/data/73",
    "fes": "https://rep.bntu.by/handle/data/98",
    "af": "https://rep.bntu.by/handle/data/100",
    "sf": "https://rep.bntu.by/handle/data/81",
    "psf": "https://rep.bntu.by/handle/data/77",
    "ftk": "https://rep.bntu.by/handle/data/97",
    "vtf": "https://rep.bntu.by/handle/data/70",
    "stf": "https://rep.bntu.by/handle/data/78",
    "fms": "https://rep.bntu.by/handle/data/88",
}

FACULTY_RU = {
    "atf": "АПФ",
    "fgde": "ФГДИЭ",
    "msf": "МСФ",
    "mtf": "МТФ",
    "fmmp": "ФММП",
    "ef": "ЭФ",
    "fitr": "ФИТР",
    "ftug": "ФТУГ",
    "ipf": "ИПФ",
    "fes": "ФЭС",
    "af": "АФ",
    "sf": "СФ",
    "psf": "ПСФ",
    "ftk": "ФТК",
    "vtf": "ВТФ",
    "stf": "СТФ",
    "fms": "ФМС",
}

SCHEDULE_FACULTIES = [
    "atf",
    "fgde",
    "msf",
    "mtf",
    "fmmp",
    "ef",
    "fitr",
    "ftug",
    "ipf",
    "fes",
    "af",
    "sf",
    "psf",
    "ftk",
    "vtf",
    "stf",
]

SCHEDULE_REPLACEMENTS = {"Практ": "Практ.", "Лекц": "Лекц.", "Лаб": "Лаб."}
SCHEDULE_PATTERN = re.compile(r"\(\s*(Практ|Лекц|Лаб)[^)]*\)", re.IGNORECASE)
SCHEDULE_GROUP_PLACEHOLDER = "Номер:"

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/135.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ru,en;q=0.9",
}

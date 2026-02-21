import aiohttp
import bs4
from typing import Union
import asyncio

async def authorize(login: str, password: str) -> Union[bool, tuple[str, str]]:
    """
    Checks if user is student or not
    If student return fullname and faculty
    Otherwise return False
    """
    async with aiohttp.ClientSession() as session:
        # Получаем страницу логина
        async with session.get("https://bntu.by/user/login", ssl=False) as response:
            content = await response.text()
            cookies = response.cookies
        
        soup = bs4.BeautifulSoup(content, "html.parser")
        token = soup.form.find("input", attrs={"name": "_token"})["value"]
        
        headers = {
            "cookie": f"XSRF-TOKEN={cookies['XSRF-TOKEN'].value}; laravel_session={cookies['laravel_session'].value}"
        }
        
        data = {"_token": token, "username": login, "password": password}
        
        # Отправляем запрос авторизации
        async with session.post(
            "https://bntu.by/user/auth", headers=headers, data=data, ssl=False
        ) as response:
            content = await response.text()
            
        print('авторизация проверена')
        
        if "pay" in str(response.url):
            soup = bs4.BeautifulSoup(content, "html.parser")
            fullname = soup.find(
                "h1", class_="newsName"
            ).next_sibling.next_sibling.text.split(",")[1][1:-22]
            info_div = soup.find("div", class_="dashboardInfo")
            for line in info_div.contents:
                if "курс" in line:
                    _, _, faculty, *_ = line.split(",")
                    break
            faculty = faculty.replace(" ", "")
            return fullname, faculty
        return False
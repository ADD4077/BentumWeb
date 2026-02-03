import aiosqlite
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import pytz

app = FastAPI()

# Настройка CORS, чтобы фронтенд мог обращаться к серверу
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserData(BaseModel):
    studentCode: str
    studentRedCode: str

DB_PATH = "database.db"

def get_moscow_now():
    tz_moscow = pytz.timezone('Europe/Moscow')
    return datetime.now(tz_moscow).strftime("%Y-%m-%d %H:%M:%S")

@app.on_event("startup")
async def startup():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_code TEXT NOT NULL,
                red_code TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        await db.commit()

@app.post("/api/save_data")
async def save_data(user: UserData):
    # 1. Валидация длины
    if len(user.studentCode) != 10 or len(user.studentRedCode) != 7:
        raise HTTPException(status_code=400, detail="Некорректный формат кодов")

    try:
        async with aiosqlite.connect(DB_PATH) as db:
            # 2. Проверка на наличие в базе (по студенческому коду)
            async with db.execute(
                "SELECT id FROM users WHERE student_code = ?", 
                (user.studentCode,)
            ) as cursor:
                existing_user = await cursor.fetchone()
                
            if existing_user:
                # Если нашли запись, возвращаем ошибку 400
                raise HTTPException(
                    status_code=400, 
                    detail="Данный студенческий код уже зарегистрирован в системе"
                )

            # 3. Если проверки пройдены — сохраняем
            moscow_time = get_moscow_now()
            await db.execute(
                "INSERT INTO users (student_code, red_code, created_at) VALUES (?, ?, ?)",
                (user.studentCode, user.studentRedCode, moscow_time)
            )
            await db.commit()
            
        return {"success": True, "message": "Данные успешно внесены"}

    except HTTPException as he:
        # Перебрасываем исключение от FastAPI (например, код 400)
        raise he
    except Exception as e:
        # Ловим системные ошибки
        print(f"Ошибка БД: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при работе с базой данных")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
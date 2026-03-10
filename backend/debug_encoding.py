import sqlite3
import os

# Подключаемся к базе данных
db_path = os.path.join(os.path.dirname(__file__), 'news', 'times_news.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Получаем 10 примеров тегов
cursor.execute("SELECT tags FROM news WHERE tags IS NOT NULL AND tags != '' LIMIT 10")
examples = cursor.fetchall()

print("Примеры тегов из базы:")
for i, ex in enumerate(examples, 1):
    print(f"{i}. {repr(ex[0])}")
    # Показываем байты для анализа кодировки
    print(f"   Bytes: {ex[0].encode('utf-8')[:50]}...")

conn.close()

import sqlite3
import os

# Подключаемся к базе данных
db_path = os.path.join(os.path.dirname(__file__), 'news', 'times_news.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Проверяем конкретные слова
test_words = ['наука', 'достижения', 'мероприятие', 'университет', 'бнту', 'конкурс', 'конференция']

print("Проверка слов в тегах:")
for word in test_words:
    cursor.execute("SELECT COUNT(*) FROM news WHERE tags LIKE ?", (f"%{word}%",))
    count = cursor.fetchone()[0]
    print(f"  '{word}': {count} новостей")

# Показываем примеры тегов с этими словами
print("\nПримеры тегов со словом 'достижения':")
cursor.execute("SELECT tags FROM news WHERE tags LIKE ? LIMIT 5", ("%достижения%",))
examples = cursor.fetchall()
for i, ex in enumerate(examples, 1):
    print(f"  {i}. {ex[0]}")

conn.close()

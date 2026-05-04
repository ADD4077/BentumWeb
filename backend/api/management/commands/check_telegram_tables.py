from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Проверяет состояние telegram таблиц в базе данных'

    def handle(self, *args, **options):
        try:
            with connection.cursor() as cursor:
                # Проверяем все таблицы с telegram в названии
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = DATABASE() 
                    AND table_name LIKE '%telegram%'
                    ORDER BY table_name
                """)
                
                tables = cursor.fetchall()
                
                self.stdout.write(self.style.SUCCESS('Найденные telegram таблицы:'))
                
                for table in tables:
                    table_name = table[0]
                    self.stdout.write(f'  - {table_name}')
                    
                    # Проверяем foreign keys для каждой таблицы
                    cursor.execute("""
                        SELECT 
                            constraint_name,
                            column_name,
                            referenced_table_name,
                            referenced_column_name
                        FROM information_schema.key_column_usage 
                        WHERE table_schema = DATABASE() 
                        AND table_name = %s
                        AND referenced_table_name IS NOT NULL
                    """, [table_name])
                    
                    fks = cursor.fetchall()
                    if fks:
                        for fk in fks:
                            constraint_name, column_name, ref_table, ref_column = fk
                            self.stdout.write(f'    FK: {column_name} -> {ref_table}.{ref_column} ({constraint_name})')
                    else:
                        self.stdout.write('    Нет foreign keys')
                
                if not tables:
                    self.stdout.write(self.style.WARNING('Telegram таблицы не найдены'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Ошибка: {str(e)}'))

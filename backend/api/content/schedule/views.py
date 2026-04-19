"""
Представления для расписания
"""
import os
import sqlite3
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ...common.decorators import allow_unverified_2fa
from ...common.utils import SQLiteConnection, get_sqlite_connection


@allow_unverified_2fa
@csrf_exempt
def get_schedule(request):
    """Получение расписания для группы пользователя"""
    if request.method != "GET":
        return JsonResponse(
            {"detail": "Метод не разрешён"},
            status=405
        )
    
    if not request.session.get('is_authenticated'):
        return JsonResponse(
            {"detail": "Требуется авторизация"},
            status=401
        )
    
    student_code = request.session.get('student_code')
    if not student_code:
        return JsonResponse(
            {"detail": "Отсутствует код студента"},
            status=400
        )
    
    try:
        conn = get_sqlite_connection('schedules/schedules.db')
        if not conn:
            return JsonResponse(
                {"detail": "База данных расписаний не найдена"},
                status=404
            )
        
        group_id = student_code[:8]
        
        with conn as cursor:
            cursor.execute("""
                SELECT day, week, time, matter, frame, teacher, classroom 
                FROM schedules 
                WHERE group_number = ? 
                ORDER BY day, week, time
            """, (group_id,))
            
            rows = cursor.fetchall()
        
        if not rows:
            return JsonResponse(
                {"detail": f"Расписание для группы {group_id} не найдено"},
                status=404
            )
        
        schedule_data = {}
        
        for row in rows:
            day, week, time, matter, frame, teacher, classroom = row
            
            if day not in schedule_data:
                schedule_data[day] = {}
            week_type = 'upper' if week == 1 else 'lower'
            if week_type not in schedule_data[day]:
                schedule_data[day][week_type] = []
            
            schedule_data[day][week_type].append({
                "time": time,
                "subject": matter,
                "type": frame,
                "teacher": teacher,
                "classroom": classroom
            })
        
        return JsonResponse({
            "success": True,
            "schedule": schedule_data,
            "student_code": student_code
        }, status=200)
        
    except sqlite3.Error as e:
        return JsonResponse(
            {"detail": "Ошибка базы данных расписаний"},
            status=500
        )
    except Exception as e:
        return JsonResponse(
            {"detail": f"Внутренняя ошибка сервера: {str(e)}"},
            status=500
        )

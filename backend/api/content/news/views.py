"""
Представления для новостей
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ...common.decorators import allow_unverified_2fa
from ...common.utils import get_sqlite_connection, parse_pagination, parse_tags


@allow_unverified_2fa
@csrf_exempt
def get_news(request):
    """Возвращает список новостей с пагинацией и фильтрацией.
    
    Параметры GET:
      - page (int) - номер страницы, начиная с 1 (по умолчанию 1)
      - page_size (int) - элементов на страницу (по умолчанию 6)
      - category (str) - фильтр по категории
      - search (str) - поисковая строка
    """
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    page, page_size = parse_pagination(request)

    search = (request.GET.get('search') or '').strip()
    category = (request.GET.get('category') or '').strip()
    sort_by = (request.GET.get('sort') or request.GET.get('sort_by') or 'date_desc').strip()

    try:
        conn = get_sqlite_connection('news/times_news.db')
        if not conn:
            return JsonResponse({"detail": "База данных новостей не найдена"}, status=404)

        where_conditions = []
        params = []

        if category and category != 'all':
            if category == 'academic':
                where_conditions.append("(tags LIKE ? OR tags LIKE ?)")
                params.extend(['%Преподаватели БНТУ%', '%БНТУ%'])
            elif category == 'achievements':
                where_conditions.append("(tags LIKE ? OR tags LIKE ?)")
                params.extend(['%Спорт%', '%Культура%'])
            elif category == 'education':
                where_conditions.append("(tags LIKE ?)")
                params.append('%Студенты%')
            elif category == 'events':
                where_conditions.append("(tags LIKE ? OR tags LIKE ?)")
                params.extend(['%Мероприятие%', '%Преподаватели БНТУ%'])
            elif category == 'sports':
                where_conditions.append("(tags LIKE ?)")
                params.append('%Спорт%')

        if search:
            search_terms = search.strip().split()
            search_conditions = []
            
            for term in search_terms:
                if term:
                    term_pattern = f"%{term}%"
                    search_conditions.append("(LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(tags) LIKE ?)")
                    params.extend([term_pattern, term_pattern, term_pattern])
            
            if search_conditions:
                where_conditions.append("(" + " OR ".join(search_conditions) + ")")

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        with conn as cursor:
            count_query = f"SELECT COUNT(*) FROM news {where_clause}"
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]

            offset = (page - 1) * page_size
            limit_clause = f"LIMIT {page_size} OFFSET {offset}"

            order_by = "timestamp DESC"
            if sort_by == 'date_asc':
                order_by = "timestamp ASC"
            elif sort_by == 'title_asc':
                order_by = "title ASC"
            elif sort_by == 'title_desc':
                order_by = "title DESC"

            query = f"""
                SELECT id, title, link, date, summary, tags, image_url, reading_time, timestamp
                FROM news 
                {where_clause} 
                ORDER BY {order_by}
                {limit_clause}
            """
            
            cursor.execute(query, params)
            rows = cursor.fetchall()

        items = []
        for row in rows:
            (news_id, title, link, date, summary, tags, image_url, reading_time, timestamp) = row
            
            news_category = 'general'
            if tags:
                if category and category != 'all':
                    news_category = category
                else:
                    tag_words = [word.strip().replace('#', '').lower() for word in tags.split(',')]
                    if 'студенты' in tag_words:
                        news_category = 'education'
                    elif 'мероприятие' in tag_words:
                        news_category = 'events'
                    elif 'спорт' in tag_words:
                        news_category = 'sports'
                    elif 'культура' in tag_words:
                        news_category = 'achievements'
                    elif 'преподаватели бнту' in tag_words or 'бнту' in tag_words:
                        news_category = 'academic'
            
            parsed_tags = parse_tags(tags)
            
            items.append({
                'id': news_id,
                'title': title or '',
                'excerpt': summary or '',
                'content': summary or '',
                'category': news_category,
                'tags': parsed_tags,
                'author': 'БНТУ',
                'date': date,
                'timestamp': timestamp,
                'imageUrl': image_url or '',
                'link': link or '',
                'featured': False,
                'readTime': f"{reading_time or 5} мин"
            })

        return JsonResponse({
            "success": True,
            "page": page,
            "page_size": page_size,
            "total": total,
            "items": items,
        }, status=200, json_dumps_params={'ensure_ascii': False})

    except Exception as e:
        return JsonResponse({"detail": f"Внутренняя ошибка сервера: {str(e)}"}, status=500)

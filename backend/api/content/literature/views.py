"""
Представления для литературы
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ...common.utils import get_sqlite_connection, parse_pagination, format_size, parse_size


@csrf_exempt
def get_literature(request):
    """Возвращает список литературы с пагинацией и фильтрацией.

    Параметры GET:
      - page (int) - номер страницы, начиная с 1 (по умолчанию 1)
      - page_size (int) - элементов на страницу (по умолчанию 6)
      - search (str) - поисковая строка по title/author/description
      - category (str) - id категории (например, "mathematics"), "all" или отсутствие означает без фильтра
    """
    if request.method != "GET":
        return JsonResponse({"detail": "Метод не разрешён"}, status=405)

    page, page_size = parse_pagination(request)

    search = (request.GET.get('search') or '').strip().lower()
    category = (request.GET.get('category') or '').strip()
    categories = request.GET.getlist('category')

    try:
        conn = get_sqlite_connection('books/literature.db')
        if not conn:
            return JsonResponse({"detail": "База данных литературы не найдена"}, status=404)

        where_conditions = []
        params = []

        if categories and 'all' not in categories:
            placeholders = ','.join(['?' for _ in categories])
            where_conditions.append(f"category IN ({placeholders})")
            params.extend(categories)

        if search:
            search_terms = search.strip().split()
            search_conditions = []
            
            for term in search_terms:
                if term:
                    term_lower = f"%{term.lower()}%"
                    term_upper = f"%{term.upper()}%"
                    term_title = f"%{term.title()}%"
                    
                    conditions = []
                    conditions.extend([
                        "title LIKE ? OR title LIKE ? OR title LIKE ?",
                        "authors LIKE ? OR authors LIKE ? OR authors LIKE ?", 
                        "description LIKE ? OR description LIKE ? OR description LIKE ?"
                    ])
                    
                    params.extend([
                        term_lower, term_upper, term_title,
                        term_lower, term_upper, term_title,
                        term_lower, term_upper, term_title
                    ])
                    
                    search_conditions.append(f"({' OR '.join(conditions) })")
            
            if search_conditions:
                where_conditions.append("(" + " OR ".join(search_conditions) + ")")

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        order_clause = "ORDER BY title ASC"
        sort_param = request.GET.get('sort', 'default')
        if sort_param != 'default':
            if sort_param == 'title_asc':
                order_clause = "ORDER BY title ASC"
            elif sort_param == 'title_desc':
                order_clause = "ORDER BY title DESC"
            elif sort_param == 'year_desc':
                order_clause = "ORDER BY publishing_date DESC"
            elif sort_param == 'year_asc':
                order_clause = "ORDER BY publishing_date ASC"
            elif sort_param == 'category_asc':
                order_clause = "ORDER BY category ASC"
            elif sort_param == 'category_desc':
                order_clause = "ORDER BY category DESC"
            elif sort_param == 'size_desc':
                order_clause = "ORDER BY title ASC"
            elif sort_param == 'size_asc':
                order_clause = "ORDER BY title ASC"

        if sort_param in ['size_desc', 'size_asc']:
            query = f"""
                SELECT rowid, title, faculty, category, authors, publishing_date, 
                       description, image_url, download_size, download_link
                FROM literature 
                {where_clause}
            """
            
            with conn as cursor:
                cursor.execute(query, params)
                all_rows = cursor.fetchall()
            
            all_items = []
            for row in all_rows:
                (rowid, title, faculty, category, authors, publishing_date, 
                 description, image_url, download_size, download_link) = row
                
                all_items.append({
                    'id': rowid,
                    'title': title or '',
                    'author': authors or '',
                    'description': description or '',
                    'category': category or '',
                    'year': publishing_date or '',
                    'faculty': faculty or '',
                    'downloadUrl': download_link,
                    'downloadSize': format_size(download_size),
                    'downloadSizeRaw': download_size,
                    'image_url': image_url
                })
            
            reverse = sort_param == 'size_desc'
            all_items.sort(key=lambda x: parse_size(x.get('downloadSizeRaw', '') or '0'), reverse=reverse)
            
            total = len(all_items)
            start = (page - 1) * page_size
            end = start + page_size
            items = all_items[start:end]
            
        else:
            count_query = f"SELECT COUNT(*) FROM literature {where_clause}"
            
            with conn as cursor:
                cursor.execute(count_query, params)
                total = cursor.fetchone()[0]

                offset = (page - 1) * page_size
                limit_clause = f"LIMIT {page_size} OFFSET {offset}"

                query = f"""
                    SELECT rowid, title, faculty, category, authors, publishing_date, 
                           description, image_url, download_size, download_link
                    FROM literature 
                    {where_clause} 
                    {order_clause} 
                    {limit_clause}
                """
                
                cursor.execute(query, params)
                rows = cursor.fetchall()

            items = []
            for row in rows:
                (rowid, title, faculty, category, authors, publishing_date, 
                 description, image_url, download_size, download_link) = row
                
                items.append({
                    'id': rowid,
                    'title': title or '',
                    'author': authors or '',
                    'description': description or '',
                    'category': category or '',
                    'year': publishing_date or '',
                    'faculty': faculty or '',
                    'downloadUrl': download_link,
                    'downloadSize': format_size(download_size),
                    'image_url': image_url
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

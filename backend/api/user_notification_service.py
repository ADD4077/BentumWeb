import logging

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class UserNotificationService:
    """Сервис для отправки уведомлений о новых пользователях в Telegram."""

    def __init__(self):
        self.bot_token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
        self.chat_id = getattr(settings, "TELEGRAM_CHAT_ID", None)
        self.new_users_topic_id = getattr(
            settings,
            "TELEGRAM_NEW_USERS_TOPIC_ID",
            3,
        )
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}"

    def send_new_user_notification(self, user_data):
        """Отправляет уведомление о новом пользователе."""
        if not self.bot_token or not self.chat_id:
            logger.error(
                "Telegram bot token or chat ID not configured for user notifications"
            )
            return False

        try:
            message = self._format_new_user_message(user_data)
            response = requests.post(
                f"{self.api_url}/sendMessage",
                json={
                    "chat_id": self.chat_id,
                    "text": message,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                    "message_thread_id": self.new_users_topic_id,
                },
                timeout=10,
            )

            if response.status_code == 200:
                logger.info(
                    "New user notification sent for %s",
                    user_data.get("student_code", "unknown"),
                )
                return True

            logger.error(
                "Failed to send new user notification: %s - %s",
                response.status_code,
                response.text,
            )
            return False
        except requests.RequestException:
            logger.exception("Network error when sending new user notification")
            return False
        except Exception:
            logger.exception("Unexpected error when sending new user notification")
            return False

    def _format_new_user_message(self, user_data):
        """Форматирует сообщение о новом пользователе."""
        current_time = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
        course = self._get_course_from_student_code(user_data.get("student_code", ""))

        return (
            "👤 <b>Новый пользователь в системе</b>\n\n"
            "<b>Информация о пользователе:</b>\n"
            f"• <b>Имя:</b> {user_data.get('fullname', 'Не указано')}\n"
            f"• <b>Группа:</b> {user_data.get('student_code', 'Не указана')}\n"
            f"• <b>Факультет:</b> {user_data.get('faculty', 'Не указан')}\n"
            f"• <b>Курс:</b> {course}\n\n"
            "<b>Данные для связи:</b>\n"
            f"• <b>ID пользователя:</b> {user_data.get('id', 'Не указан')}\n"
            f"• <b>Дата регистрации:</b> {current_time}\n\n"
            "🔔 <b>Статус:</b> ✅ Активен\n\n"
            "<i>Пользователь успешно зарегистрирован в системе BentumWeb</i>"
        )

    def _get_course_from_student_code(self, student_code):
        """Определяет курс на основе номера группы."""
        if not student_code or len(student_code) < 8:
            return "Не определен"

        try:
            year_suffix = student_code[6:8]
            admission_year = 2000 + int(year_suffix)
            current_year = timezone.now().year
            current_month = timezone.now().month

            if current_month >= 9:
                course = current_year - admission_year + 1
            else:
                course = current_year - admission_year

            if course < 1:
                course = 1
            elif course > 5:
                course = "Выпускник"

            return f"{course} курс" if isinstance(course, int) else course
        except (ValueError, IndexError):
            return "Не определен"

    def test_connection(self):
        """Проверяет возможность отправки уведомлений о новых пользователях."""
        if not self.bot_token or not self.chat_id:
            return {
                "success": False,
                "error": "Токен бота или chat ID не настроены",
                "topic_id": self.new_users_topic_id,
            }

        try:
            test_message = (
                "🧪 <b>Тест уведомлений о новых пользователях</b>\n\n"
                "✅ Сервис уведомлений работает корректно\n"
                f"📱 Тема для новых пользователей: {self.new_users_topic_id}\n"
                f"⏰ Время теста: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                "<i>Это тестовое сообщение для проверки работы уведомлений</i>"
            )

            response = requests.post(
                f"{self.api_url}/sendMessage",
                json={
                    "chat_id": self.chat_id,
                    "text": test_message,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                    "message_thread_id": self.new_users_topic_id,
                },
                timeout=10,
            )

            if response.status_code == 200:
                return {
                    "success": True,
                    "message": "Тестовое уведомление успешно отправлено",
                    "topic_id": self.new_users_topic_id,
                    "response": response.json(),
                }

            return {
                "success": False,
                "error": (
                    "Не удалось отправить тест: "
                    f"{response.status_code} - {response.text}"
                ),
                "topic_id": self.new_users_topic_id,
            }
        except requests.RequestException as exc:
            logger.exception("Network error during user notification test")
            return {
                "success": False,
                "error": str(exc),
                "topic_id": self.new_users_topic_id,
            }
        except Exception as exc:
            logger.exception("Unexpected error during user notification test")
            return {
                "success": False,
                "error": str(exc),
                "topic_id": self.new_users_topic_id,
            }

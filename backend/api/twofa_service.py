"""Two Factor Authentication Service"""
import random
import string
import logging
import urllib.request
import urllib.parse
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from .models import User
from .models import TelegramBinding

logger = logging.getLogger(__name__)

class TwoFAService:
    """Service for handling Two Factor Authentication"""
    
    def is_2fa_required(self, user):
        """Check if 2FA is required for user"""
        if not user:
            return False

        if not getattr(user, 'twofa_enabled', False):
            return False

        return user.twofa_method in ['telegram', 'email']
    
    def generate_6fa_code(self):
        """Generate 6-digit 2FA code"""
        return ''.join(random.choices(string.digits, k=6))
    
    def get_existing_code(self, student_code):
        """Get existing valid code if any"""
        cache_key_code = f'2fa_code_{student_code}'
        cache_key_time = f'2fa_time_{student_code}'
        
        code = cache.get(cache_key_code)
        timestamp = cache.get(cache_key_time)
        
        if code and timestamp:
            import time
            remaining = 300 - (int(time.time()) - timestamp)
            if remaining > 0:
                return code, remaining
        return None, 0
    
    def store_2fa_code(self, student_code, code):
        """Store 2FA code in cache with timestamp"""
        cache_key_code = f'2fa_code_{student_code}'
        cache_key_time = f'2fa_time_{student_code}'
        
        import time
        timestamp = int(time.time())
        
        cache.set(cache_key_code, code, timeout=300)  # 5 minutes
        cache.set(cache_key_time, timestamp, timeout=300)
        
        # Verify it was stored
        stored = cache.get(cache_key_code)
        stored_time = cache.get(cache_key_time)
        logger.info(f"Stored 2FA code for {student_code}: code={code}, stored={stored}, time={stored_time}")
    
    def verify_2fa_code(self, student_code: str, code: str) -> bool:
        """Verify 2FA code"""
        cache_key_code = f"2fa_code_{student_code}"
        cache_key_time = f"2fa_time_{student_code}"
        
        stored_code = cache.get(cache_key_code)
        logger.info(f"Verifying 2FA for {student_code}: provided={code}, stored={stored_code}")
        
        if stored_code and stored_code == code:
            cache.delete(cache_key_code)
            cache.delete(cache_key_time)
            logger.info(f"2FA verified successfully for {student_code}")
            return True
        logger.warning(f"2FA verification failed for {student_code}: provided={code}, stored={stored_code}")
        return False
    
    def send_2fa_code_telegram_sync(self, user, code):
        """Send 2FA code via Telegram (synchronous version)"""
        try:
            bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
            if not bot_token:
                return False, "TELEGRAM_BOT_TOKEN is not configured"

            binding = TelegramBinding.objects.filter(user=user, is_active=True).first()
            if not binding or not binding.telegram_id or binding.telegram_id == 0:
                return False, "Telegram account is not linked"

            chat_id = binding.telegram_id
            text = (
                "Код двухфакторной аутентификации (2FA): "
                f"{code}\n\n"
                "Если это не вы — просто проигнорируйте сообщение."
            )

            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            data = urllib.parse.urlencode({
                'chat_id': str(chat_id),
                'text': text,
            }).encode('utf-8')

            req = urllib.request.Request(url, data=data, method='POST')
            with urllib.request.urlopen(req, timeout=10) as resp:
                body = resp.read().decode('utf-8', errors='ignore')
                if resp.status != 200:
                    return False, f"Telegram API returned {resp.status}: {body[:200]}"

            logger.info(f"Sent 2FA code to Telegram for user {user.student_code} (chat_id={chat_id})")
            return True, "2FA code sent successfully"
        except Exception as e:
            logger.error(f"Error sending 2FA code via Telegram: {e}")
            return False, str(e)
    
    def send_2fa_code_email(self, user, code):
        """Send 2FA code via email"""
        try:
            # Get email from user - check multiple possible fields
            email = getattr(user, 'email', None) or getattr(user, 'student_code', None)
            if not email:
                return False, "User does not have an email address"
            
            # Ensure email format (if student_code is used, append domain)
            if '@' not in str(email):
                email = f"{email}@student.bntu.by"
            
            subject = "Код двухфакторной аутентификации (2FA)"
            message = (
                f"Ваш код двухфакторной аутентификации: {code}\n\n"
                f"Код действителен в течение 5 минут.\n\n"
                f"Если это не вы — проигнорируйте это сообщение."
            )
            
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@bentum.by')
            
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email,
                recipient_list=[email],
                fail_silently=False,
            )
            
            logger.info(f"Sent 2FA code to email for user {user.student_code}")
            return True, "2FA code sent successfully"
        except Exception as e:
            logger.error(f"Error sending 2FA code via email: {e}")
            return False, str(e)

# Create singleton instance
twofa_service = TwoFAService()

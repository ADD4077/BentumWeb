"""Legacy compatibility wrappers for 2FA endpoints."""

from .security.twofa.views import get_2fa_config, resend_2fa_code, verify_2fa

__all__ = ["get_2fa_config", "verify_2fa", "resend_2fa_code"]

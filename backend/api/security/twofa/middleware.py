from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin


class TwoFAAuthenticationMiddleware(MiddlewareMixin):
    """
    Blocks authenticated requests when 2FA is enabled but the current session
    has not completed verification yet.

    Application routes can explicitly opt out by setting
    `_allow_unverified_2fa = True` on the resolved view.
    """

    infrastructure_prefixes = (
        "/admin/",
        "/static/",
        "/media/",
    )

    def process_view(self, request, view_func, view_args, view_kwargs):
        del view_args, view_kwargs

        if request.path.startswith(self.infrastructure_prefixes):
            return None

        if getattr(view_func, "_allow_unverified_2fa", False):
            return None

        if not request.session.get("is_authenticated"):
            return None

        student_code = request.session.get("student_code")
        if not student_code:
            return None

        try:
            from ...models import User

            user = User.objects.filter(student_code=student_code).first()
            if not user:
                return JsonResponse(
                    {
                        "success": False,
                        "detail": "Authenticated user not found",
                    },
                    status=401,
                )

            if not getattr(user, "twofa_enabled", False):
                return None

            if not request.session.get("twofa_verified", False):
                return JsonResponse(
                    {
                        "success": False,
                        "detail": "2FA verification required",
                        "requires_2fa": True,
                    },
                    status=403,
                )

            return None
        except Exception:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Unable to verify 2FA state",
                },
                status=503,
            )

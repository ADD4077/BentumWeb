from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .utils import get_current_user, is_request_authenticated


class SessionUserAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def success_response(self, *, message=None, http_status=status.HTTP_200_OK, **payload):
        body = {"success": True, **payload}
        if message is not None:
            body["message"] = message
        return Response(body, status=http_status)

    def error_response(self, detail, *, http_status=status.HTTP_400_BAD_REQUEST, **payload):
        body = {"success": False, "detail": detail, **payload}
        return Response(body, status=http_status)

    def get_session_user(self, request):
        if not is_request_authenticated(request):
            return None, self.error_response("Требуется авторизация", http_status=status.HTTP_401_UNAUTHORIZED)

        user = get_current_user(request)
        if not user:
            return None, self.error_response("Пользователь не найден", http_status=status.HTTP_404_NOT_FOUND)

        return user, None

    def require_completed_2fa(self, request):
        if request.session.get("twofa_pending") and not request.session.get("twofa_verified", False):
            return self.error_response(
                "Требуется завершить проверку 2FA",
                http_status=status.HTTP_403_FORBIDDEN,
                requires_2fa=True,
            )
        return None

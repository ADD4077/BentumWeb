"""
Модульные тесты для API сервисов
"""
import pytest
from django.test import TestCase
from api.twofa_service import TwoFAService
from api.ban_service import BanService


class TestTwoFAService(TestCase):
    """Тест сервиса TwoFA"""
    
    def setUp(self):
        self.service = TwoFAService()
    
    def test_generate_6fa_code(self):
        """Тест генерации кода 2FA"""
        code = self.service.generate_6fa_code()
        assert len(code) == 6
        assert code.isdigit()
    
    def test_is_2fa_required_none_user(self):
        """Тест проверки требования 2FA с None пользователем"""
        assert not self.service.is_2fa_required(None)
    
    def test_is_2fa_required_disabled(self):
        """Тест проверки требования 2FA с отключенным 2FA"""
        class MockUser:
            twofa_enabled = False
            twofa_method = None
        
        user = MockUser()
        assert not self.service.is_2fa_required(user)


class TestValidators(TestCase):
    """Тест Pydantic валидаторов"""
    from api.validators import LoginRequest, TwoFAVerifyRequest
    
    def test_login_request_valid(self):
        """Тест валидного запроса входа"""
        data = {"student_code": "123456", "password": "password"}
        request = self.LoginRequest(**data)
        assert request.student_code == "123456"
        assert request.password == "password"
    
    def test_login_request_invalid_code(self):
        """Тест неверного кода студента (не числовой)"""
        data = {"student_code": "abc", "password": "password"}
        with pytest.raises(ValueError):
            self.LoginRequest(**data)
    
    def test_twofa_verify_request_valid(self):
        """Тест валидного запроса проверки 2FA"""
        data = {"code": "123456"}
        request = self.TwoFAVerifyRequest(**data)
        assert request.code == "123456"
    
    def test_twofa_verify_request_invalid_length(self):
        """Тест неверной длины кода 2FA"""
        data = {"code": "12345"}
        with pytest.raises(ValueError):
            self.TwoFAVerifyRequest(**data)


class TestBanService(TestCase):
    """Тест сервиса банов"""
    
    def test_check_ban_status(self):
        """Тест проверки статуса бана"""
        # Это потребует настройки базы данных
        # Пока просто тестируем, что сервис существует
        from api.ban_service import BanService
        service = BanService()
        assert service is not None

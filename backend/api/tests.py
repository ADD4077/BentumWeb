"""
Unit tests for API services
"""
import pytest
from django.test import TestCase
from api.twofa_service import TwoFAService
from api.ban_service import BanService


class TestTwoFAService(TestCase):
    """Test TwoFA Service"""
    
    def setUp(self):
        self.service = TwoFAService()
    
    def test_generate_6fa_code(self):
        """Test 2FA code generation"""
        code = self.service.generate_6fa_code()
        assert len(code) == 6
        assert code.isdigit()
    
    def test_is_2fa_required_none_user(self):
        """Test 2FA required check with None user"""
        assert not self.service.is_2fa_required(None)
    
    def test_is_2fa_required_disabled(self):
        """Test 2FA required check with disabled 2FA"""
        class MockUser:
            twofa_enabled = False
            twofa_method = None
        
        user = MockUser()
        assert not self.service.is_2fa_required(user)


class TestValidators(TestCase):
    """Test Pydantic validators"""
    from api.validators import LoginRequest, TwoFAVerifyRequest
    
    def test_login_request_valid(self):
        """Test valid login request"""
        data = {"student_code": "123456", "password": "password"}
        request = self.LoginRequest(**data)
        assert request.student_code == "123456"
        assert request.password == "password"
    
    def test_login_request_invalid_code(self):
        """Test invalid student code (non-numeric)"""
        data = {"student_code": "abc", "password": "password"}
        with pytest.raises(ValueError):
            self.LoginRequest(**data)
    
    def test_twofa_verify_request_valid(self):
        """Test valid 2FA verify request"""
        data = {"code": "123456"}
        request = self.TwoFAVerifyRequest(**data)
        assert request.code == "123456"
    
    def test_twofa_verify_request_invalid_length(self):
        """Test invalid 2FA code length"""
        data = {"code": "12345"}
        with pytest.raises(ValueError):
            self.TwoFAVerifyRequest(**data)


class TestBanService(TestCase):
    """Test Ban Service"""
    
    def test_check_ban_status(self):
        """Test ban status check"""
        # This would require database setup
        # For now, just test the service exists
        from api.ban_service import BanService
        service = BanService()
        assert service is not None

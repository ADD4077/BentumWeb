import re
from typing import Dict, Optional

class UserAgentParser:
    """Сервис для парсинга User-Agent строк"""
    
    @staticmethod
    def parse(user_agent: str) -> Dict[str, Optional[str]]:
        """
        Парсит User-Agent строку и извлекает информацию о браузере и ОС
        
        Args:
            user_agent: User-Agent строка из HTTP заголовка
            
        Returns:
            Dict с полями browser, os, или пустые значения если не удалось определить
        """
        if not user_agent:
            return {"browser": None, "os": None}
        
        user_agent = user_agent.lower()
        
        # Определяем браузер
        browser = UserAgentParser._detect_browser(user_agent)
        
        # Определяем операционную систему
        os = UserAgentParser._detect_os(user_agent)
        
        return {
            "browser": browser,
            "os": os
        }
    
    @staticmethod
    def _detect_browser(user_agent: str) -> Optional[str]:
        """Определяет браузер из User-Agent"""
        
        # Opera GX (проверяем до Chrome, так как GX содержит "chrome")
        if "opr" in user_agent or "opera" in user_agent:
            if "gx" in user_agent.lower():
                # Opera GX
                if "opr" in user_agent:
                    match = re.search(r'opr/(\d+\.\d+)', user_agent)
                    version = match.group(1) if match else ""
                    return f"Opera GX {version}"
                else:
                    return "Opera GX"
            # Обычная Opera
            elif "opr" in user_agent:
                match = re.search(r'opr/(\d+\.\d+)', user_agent)
                version = match.group(1) if match else ""
                return f"Opera {version}"
            else:
                match = re.search(r'version/(\d+\.\d+).*opera', user_agent)
                version = match.group(1) if match else ""
                return f"Opera {version}"
        
        # Edge
        elif "edg" in user_agent:
            match = re.search(r'edg/(\d+\.\d+)', user_agent)
            version = match.group(1) if match else ""
            return f"Edge {version}"
        
        # Chrome (проверяем после Opera, так как Opera на базе Chrome)
        elif "chrome" in user_agent and "edg" not in user_agent and "opr" not in user_agent:
            match = re.search(r'chrome/(\d+\.\d+)', user_agent)
            version = match.group(1) if match else ""
            return f"Chrome {version}"
        
        # Firefox
        elif "firefox" in user_agent:
            match = re.search(r'firefox/(\d+\.\d+)', user_agent)
            version = match.group(1) if match else ""
            return f"Firefox {version}"
        
        # Safari
        elif "safari" in user_agent and "chrome" not in user_agent and "opr" not in user_agent:
            match = re.search(r'version/(\d+\.\d+).*safari', user_agent)
            version = match.group(1) if match else ""
            return f"Safari {version}"
        
        # Internet Explorer
        elif "msie" in user_agent:
            match = re.search(r'msie (\d+\.\d+)', user_agent)
            version = match.group(1) if match else ""
            return f"Internet Explorer {version}"
        
        # Mobile browsers
        elif "mobile" in user_agent:
            if "chrome" in user_agent and "opr" not in user_agent:
                return "Mobile Chrome"
            elif "safari" in user_agent:
                return "Mobile Safari"
        
        return "Unknown Browser"
    
    @staticmethod
    def _detect_os(user_agent: str) -> Optional[str]:
        """Определяет операционную систему из User-Agent"""
        
        # Windows
        if "windows" in user_agent:
            if "windows nt 10" in user_agent:
                return "Windows 10/11"
            elif "windows nt 6.3" in user_agent:
                return "Windows 8.1"
            elif "windows nt 6.2" in user_agent:
                return "Windows 8"
            elif "windows nt 6.1" in user_agent:
                return "Windows 7"
            else:
                return "Windows"
        
        # macOS
        elif "mac os x" in user_agent:
            match = re.search(r'mac os x ([0-9_]+)', user_agent)
            if match:
                version = match.group(1).replace('_', '.')
                return f"macOS {version}"
            return "macOS"
        
        # Linux
        elif "linux" in user_agent:
            if "ubuntu" in user_agent:
                return "Ubuntu"
            elif "debian" in user_agent:
                return "Debian"
            elif "fedora" in user_agent:
                return "Fedora"
            elif "arch" in user_agent:
                return "Arch Linux"
            else:
                return "Linux"
        
        # Android
        elif "android" in user_agent:
            match = re.search(r'android ([0-9\.]+)', user_agent)
            if match:
                version = match.group(1)
                return f"Android {version}"
            return "Android"
        
        # iOS
        elif "iphone" in user_agent:
            match = re.search(r'iphone os ([0-9_]+)', user_agent)
            if match:
                version = match.group(1).replace('_', '.')
                return f"iOS {version} (iPhone)"
            return "iOS (iPhone)"
        
        elif "ipad" in user_agent:
            match = re.search(r'ipad.*os ([0-9_]+)', user_agent)
            if match:
                version = match.group(1).replace('_', '.')
                return f"iOS {version} (iPad)"
            return "iOS (iPad)"
        
        # Other Unix-like systems
        elif "unix" in user_agent:
            return "Unix"
        elif "bsd" in user_agent:
            return "BSD"
        
        return "Unknown OS"

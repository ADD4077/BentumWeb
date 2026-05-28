import re
from typing import Dict, Optional


class UserAgentParser:
    """Service for extracting browser and OS labels from a user-agent string."""

    @staticmethod
    def parse(user_agent: str) -> Dict[str, Optional[str]]:
        if not user_agent:
            return {"browser": None, "os": None}

        normalized = user_agent.lower()
        return {
            "browser": UserAgentParser._detect_browser(normalized),
            "os": UserAgentParser._detect_os(normalized),
        }

    @staticmethod
    def _detect_browser(user_agent: str) -> Optional[str]:
        if "opr" in user_agent or "opera" in user_agent:
            if "gx" in user_agent:
                if "opr" in user_agent:
                    match = re.search(r"opr/(\d+\.\d+)", user_agent)
                    version = match.group(1) if match else ""
                    return f"Opera GX {version}".strip()
                return "Opera GX"

            if "opr" in user_agent:
                match = re.search(r"opr/(\d+\.\d+)", user_agent)
                version = match.group(1) if match else ""
                return f"Opera {version}".strip()

            match = re.search(r"version/(\d+\.\d+).*opera", user_agent)
            version = match.group(1) if match else ""
            return f"Opera {version}".strip()

        if "edg" in user_agent:
            match = re.search(r"edg/(\d+\.\d+)", user_agent)
            version = match.group(1) if match else ""
            return f"Edge {version}".strip()

        if "chrome" in user_agent and "edg" not in user_agent and "opr" not in user_agent:
            match = re.search(r"chrome/(\d+\.\d+)", user_agent)
            version = match.group(1) if match else ""
            return f"Chrome {version}".strip()

        if "firefox" in user_agent:
            match = re.search(r"firefox/(\d+\.\d+)", user_agent)
            version = match.group(1) if match else ""
            return f"Firefox {version}".strip()

        if "safari" in user_agent and "chrome" not in user_agent and "opr" not in user_agent:
            match = re.search(r"version/(\d+\.\d+).*safari", user_agent)
            version = match.group(1) if match else ""
            return f"Safari {version}".strip()

        if "msie" in user_agent:
            match = re.search(r"msie (\d+\.\d+)", user_agent)
            version = match.group(1) if match else ""
            return f"Internet Explorer {version}".strip()

        if "mobile" in user_agent:
            if "chrome" in user_agent and "opr" not in user_agent:
                return "Mobile Chrome"
            if "safari" in user_agent:
                return "Mobile Safari"

        return "Unknown browser"

    @staticmethod
    def _detect_os(user_agent: str) -> Optional[str]:
        # Mobile user-agents often also include generic desktop tokens.
        # Android commonly includes "linux", and iPhone/iPad include "mac os x".
        # We detect mobile platforms first so session analytics stay accurate.
        if "android" in user_agent:
            match = re.search(r"android ([0-9\.]+)", user_agent)
            if match:
                return f"Android {match.group(1)}"
            return "Android"

        if "iphone" in user_agent:
            match = re.search(r"iphone os ([0-9_]+)", user_agent)
            if match:
                return f"iOS {match.group(1).replace('_', '.')} (iPhone)"
            return "iOS (iPhone)"

        if "ipad" in user_agent:
            match = re.search(r"ipad.*os ([0-9_]+)", user_agent)
            if match:
                return f"iOS {match.group(1).replace('_', '.')} (iPad)"
            return "iOS (iPad)"

        if "windows" in user_agent:
            if "windows nt 10" in user_agent:
                return "Windows 10/11"
            if "windows nt 6.3" in user_agent:
                return "Windows 8.1"
            if "windows nt 6.2" in user_agent:
                return "Windows 8"
            if "windows nt 6.1" in user_agent:
                return "Windows 7"
            return "Windows"

        if "mac os x" in user_agent:
            match = re.search(r"mac os x ([0-9_]+)", user_agent)
            if match:
                return f"macOS {match.group(1).replace('_', '.')}"
            return "macOS"

        if "linux" in user_agent:
            if "ubuntu" in user_agent:
                return "Ubuntu"
            if "debian" in user_agent:
                return "Debian"
            if "fedora" in user_agent:
                return "Fedora"
            if "arch" in user_agent:
                return "Arch Linux"
            return "Linux"

        if "unix" in user_agent:
            return "Unix"
        if "bsd" in user_agent:
            return "BSD"

        return "Unknown OS"

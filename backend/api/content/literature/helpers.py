from ..constants import LITERATURE_TOP_LEVEL_SECTIONS


def repair_mojibake(value):
    text = str(value or "").strip()
    if not text:
        return ""

    if "Р " not in text and "РЎ" not in text:
        return text

    try:
        repaired = text.encode("cp1251").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text

    return repaired or text


def get_allowed_categories():
    return list(LITERATURE_TOP_LEVEL_SECTIONS.keys())


def get_decoded_to_raw_categories():
    return {
        repair_mojibake(category): category
        for category in get_allowed_categories()
    }

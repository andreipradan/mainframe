CATEGORY_ID_BY_NAME = {
    "music": 1,
    "sport": 2,
    "film": 3,
    "other": 4,
    "theater": 5,
    "online": 6,
}
CATEGORY_NAME_BY_ID = {v: k for k, v in CATEGORY_ID_BY_NAME.items()}


def get_category(category):
    return {
        "concert": "music",
        "concerte": "music",
        "musical": "music",
        "proiectii de film": "film",
        "sports": "sport",
        "teatru": "theater",
    }.get(category.lower(), category.lower())

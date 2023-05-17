from operator import itemgetter
from pathlib import Path


def get_folder_contents(folder):
    return sorted(
        [
            {
                "name": item.name,
                "is_file": item.is_file(),
            }
            for item in Path(folder).iterdir()
        ],
        key=itemgetter("is_file", "name"),
    )

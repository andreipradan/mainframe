from types import SimpleNamespace

import pytest

from mainframe.finance.management.commands.fetch_unit_values import extract_azt


@pytest.mark.parametrize(
    "content",
    [
        "",
        "<td>Evolutie Fonduri de Pensii raportate la data de:</td>",
    ],
)
def test_extract_azt_rejects_missing_reporting_date(content):
    response = SimpleNamespace(content=content.encode())

    with pytest.raises(ValueError, match="missing its reporting date"):
        extract_azt(response, {})

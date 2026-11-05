from unittest import mock

import pytest

from mainframe.clients import dexonline


class TestFetchDefinition:
    @mock.patch("mainframe.clients.dexonline.fetch")
    @mock.patch("mainframe.clients.dexonline.random.choice")
    @mock.patch(
        "builtins.open",
        new_callable=mock.mock_open,
        read_data="a\nword\napple\nberry\n",
    )
    def test_selects_from_words_at_least_minimum_length(
        self, mock_open, mock_choice, mock_fetch
    ):
        mock_choice.return_value = "apple"
        response = mock.MagicMock()
        response.json.return_value = {
            "definitions": [{"htmlRep": "n. definition"}],
        }
        mock_fetch.return_value = (response, None)

        result = dexonline.fetch_definition()

        mock_choice.assert_called_once_with(["apple", "berry"])
        mock_fetch.assert_called_once_with(
            "https://dexonline.ro/definitie/apple/json", 1, False
        )
        assert result == ("n.", "definition")

    @mock.patch(
        "builtins.open",
        new_callable=mock.mock_open,
        read_data="a\nword\n",
    )
    def test_raises_when_no_words_meet_minimum_length(self, mock_open):
        with pytest.raises(
            dexonline.DexOnlineError,
            match="No words with sufficient length found",
        ):
            dexonline.fetch_definition()

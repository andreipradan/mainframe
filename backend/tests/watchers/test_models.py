import pytest
from django.core.exceptions import ValidationError

from tests.factories.watchers import WatcherFactory


@pytest.mark.django_db
class TestClean:
    @pytest.mark.parametrize("latest", ["", None, {}, {"foo": "bar"}, {"title": "1"}])
    def test_keys(self, latest):
        with pytest.raises(ValidationError) as e:
            WatcherFactory(latest=latest)
        assert e.value.args == ("latest must have keys {'title', 'url'}", None, None)

    @pytest.mark.parametrize(
        "latest",
        [
            {"title": 1, "url": "foo"},
            {"title": None, "url": None},
            {"title": "", "url": None},
        ],
    )
    def test_title(self, latest):
        with pytest.raises(ValidationError) as e:
            WatcherFactory(latest=latest)
        assert e.value.args == ("latest['title'] must be a string", None, None)

    @pytest.mark.parametrize(
        "latest",
        [
            {"title": "1", "url": ""},
            {"title": "1", "url": None},
        ],
    )
    def test_url(self, latest):
        with pytest.raises(ValidationError) as e:
            WatcherFactory(latest=latest)
        assert e.value.args == ("latest['url'} must be a string", None, None)

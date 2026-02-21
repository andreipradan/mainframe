from unittest.mock import patch

import dotenv
import pytest

from tests.factories.authentication import ActiveSessionFactory
from tests.factories.user import UserFactory

dotenv.load_dotenv()


@pytest.fixture(autouse=True)
def fast_password_hasher(settings):
    """Use a fast password hasher in tests to avoid expensive PBKDF2 hashing."""
    settings.PASSWORD_HASHERS = [
        "django.contrib.auth.hashers.MD5PasswordHasher",
    ]
    yield


# in order for pytest-asyncio (uses sockets) to work with
# pytest-socket (which disables all sockets)
def pytest_collection_modifyitems(config, items):
    # block all external socket connections by default
    for item in items:
        item.add_marker(pytest.mark.allow_hosts(["127.0.0.1", "::1"]))


@pytest.fixture(autouse=True)
def disable_google_generativeai_api_calls():
    with patch("mainframe.clients.gemini.genai") as mock_method:
        mock_method.return_value = {"status": "success", "data": "Mocked response data"}
        yield mock_method


@pytest.fixture
def staff_session():
    user = UserFactory(is_staff=True, is_active=True)
    return ActiveSessionFactory(user=user)


@pytest.fixture
def session(db):
    user = UserFactory(is_active=True)
    return ActiveSessionFactory(user=user)

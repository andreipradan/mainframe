from unittest.mock import patch

import dotenv
import pytest
from mainframe.api.authentication.models import ActiveSession
from mainframe.api.authentication.serializers import _generate_jwt_token
from mainframe.api.user.models import User

dotenv.load_dotenv()


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
    user_data = {"email": "foo@bar.com", "password": "password", "is_active": True}
    user = User.objects.create(**user_data, username="foo@bar.com", is_staff=True)
    return ActiveSession.objects.create(user=user, token=_generate_jwt_token(user))


@pytest.fixture
@pytest.mark.django_db
def session():
    user_data = {"email": "foo@bar.com", "password": "password", "is_active": True}
    user = User.objects.create(**user_data, username="foo@bar.com")
    return ActiveSession.objects.create(user=user, token=_generate_jwt_token(user))

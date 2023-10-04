import pytest
from api.authentication.models import ActiveSession
from api.authentication.serializers.login import _generate_jwt_token
from api.user.models import User


@pytest.fixture
def session(db):
    user_data = {"email": "foo@bar.com", "password": "password"}
    user = User.objects.create(**user_data, username="foo@bar.com")
    return ActiveSession.objects.create(user=user, token=_generate_jwt_token(user))

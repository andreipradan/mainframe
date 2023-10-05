import dotenv
import pytest

from api.authentication.models import ActiveSession
from api.authentication.serializers import _generate_jwt_token
from api.user.models import User

dotenv.load_dotenv()


@pytest.fixture
@pytest.mark.django_db
def session():
    user_data = {"email": "foo@bar.com", "password": "password", "is_active": True}
    user = User.objects.create(**user_data, username="foo@bar.com", is_staff=True)
    return ActiveSession.objects.create(user=user, token=_generate_jwt_token(user))

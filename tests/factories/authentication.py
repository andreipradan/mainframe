import factory

from mainframe.api.authentication.models import ActiveSession
from mainframe.api.authentication.serializers import _generate_jwt_token
from tests.factories.user import UserFactory


class ActiveSessionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ActiveSession

    user = factory.SubFactory(UserFactory)
    token = factory.LazyAttribute(lambda obj: _generate_jwt_token(obj.user))

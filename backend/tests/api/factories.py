import factory.django

from api.user.models import User


class UserFactory(factory.django.DjangoModelFactory):

    class Meta:
        model = User

    password = factory.PostGenerationMethodCall("set_password", "password")

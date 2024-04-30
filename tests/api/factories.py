import factory.django
from mainframe.api.user.models import User


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda i: f"email{i}@foo.bar")
    password = factory.PostGenerationMethodCall("set_password", "password")
    username = factory.Sequence(lambda i: f"username-{i}")

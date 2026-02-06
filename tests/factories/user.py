import factory

from mainframe.api.user.models import User


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.Sequence(lambda i: f"email{i}@foo.bar")
    username = factory.Sequence(lambda i: f"username-{i}")

    @factory.post_generation
    def set_user_password(self, create, extracted, **kwargs):
        if create:
            password = extracted or "password"
            self.set_password(password)
            self.save()

import jwt
from django.conf import settings
from jwt.exceptions import ExpiredSignatureError
from mainframe.api.authentication.models import ActiveSession
from mainframe.api.user.models import User
from rest_framework import authentication, exceptions


class ActiveSessionAuthentication(authentication.BaseAuthentication):
    auth_error_message = {"success": False, "msg": "User is not logged on."}

    def authenticate(self, request):
        request.user = None
        auth_header = authentication.get_authorization_header(request)
        if not auth_header:
            return None

        token = auth_header.decode("utf-8")
        return self._authenticate_credentials(token)

    def _authenticate_credentials(self, token):
        try:
            jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        except ExpiredSignatureError as e:
            raise exceptions.AuthenticationFailed(self.auth_error_message) from e

        try:
            active_session = ActiveSession.objects.get(token=token)
        except ActiveSession.DoesNotExist as e:
            raise exceptions.AuthenticationFailed(self.auth_error_message) from e

        try:
            user = active_session.user
        except User.DoesNotExist as e:
            msg = {"success": False, "msg": "No user matching this token was found."}
            raise exceptions.AuthenticationFailed(msg) from e

        if not user.is_active:
            msg = {"success": False, "msg": "This user has been deactivated."}
            raise exceptions.AuthenticationFailed(msg)

        return user, token

from rest_framework import viewsets, mixins
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from api.authentication.models import ActiveSession


class LogoutViewSet(viewsets.GenericViewSet, mixins.CreateModelMixin):
    permission_classes = (AllowAny,)

    def create(self, request, *args, **kwargs):
        ActiveSession.objects.filter(user=request.user).delete()
        return Response(
            {"success": True, "msg": "Token revoked"}, status=status.HTTP_200_OK
        )

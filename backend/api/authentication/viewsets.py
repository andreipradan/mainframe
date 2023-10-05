from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.authentication.models import ActiveSession
from api.authentication.serializers import LoginSerializer, RegisterSerializer


class ActiveSessionViewSet(viewsets.GenericViewSet, mixins.CreateModelMixin):
    http_method_names = ["post"]
    permission_classes = (IsAuthenticated,)

    def create(self, request, *args, **kwargs):
        return Response({"success": True}, status.HTTP_200_OK)


class LoginViewSet(viewsets.GenericViewSet, mixins.CreateModelMixin):
    permission_classes = (AllowAny,)
    serializer_class = LoginSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class LogoutViewSet(viewsets.GenericViewSet, mixins.CreateModelMixin):
    permission_classes = (AllowAny,)

    def create(self, request, *args, **kwargs):
        ActiveSession.objects.filter(user=request.user).delete()
        data = {"success": True, "msg": "Token revoked"}
        return Response(data=data, status=status.HTTP_200_OK)


class RegisterViewSet(viewsets.ModelViewSet):
    http_method_names = ["post"]
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "success": True,
                "userID": user.id,
                "msg": "The user was successfully registered",
            },
            status=status.HTTP_201_CREATED,
        )

import asyncio

from django.conf import settings
from django.db import IntegrityError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from mainframe.api.authentication.models import ActiveSession
from mainframe.api.authentication.serializers import LoginSerializer, RegisterSerializer
from mainframe.api.user.models import User
from mainframe.api.user.serializers import ChangePasswordSerializer, UserSerializer
from mainframe.clients.chat import send_telegram_message


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.order_by("-is_staff", "-is_active", "email")
    serializer_class = UserSerializer
    permission_classes = (IsAdminUser,)

    def get_permissions(self):
        if self.action in ["login", "register"]:
            return [AllowAny()]
        if self.action == "logout":
            return [IsAuthenticated()]
        if (
            self.action in ["partial_update", "change_password"]
            and str(self.request.user.pk) == self.kwargs["pk"]
        ):
            return [IsAuthenticated()]
        return super().get_permissions()

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except IntegrityError as e:
            raise ValidationError(str(e).split("DETAIL: ")[1].strip()) from e

    @action(detail=True, methods=["put"], url_path="change-password")
    def change_password(self, *_, **__):
        serializer = ChangePasswordSerializer(
            data=self.request.data,
            instance=self.request.user,
            context={"request": self.request},
        )
        serializer.is_valid(raise_exception=True)
        data = self.serializer_class(instance=serializer.instance).data
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def login(self, request, *_, **__):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["put"])
    def logout(self, request, *_, **__):
        ActiveSession.objects.filter(user=request.user).delete()
        return Response(data={"msg": "Token revoked"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def register(self, request, *_, **__):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        data = {"msg": "You were successfully registered 🎉"}
        if settings.ENV == "prod":
            asyncio.run(send_telegram_message(f"New mainframe user: {user.email}"))
        return Response(data=data, status=status.HTTP_201_CREATED)

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.response import Response

from api.authentication.models import ActiveSession
from api.authentication.serializers import LoginSerializer, RegisterSerializer
from api.user.models import User
from api.user.serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = (IsAdminUser,)

    def get_permissions(self):
        if self.action in ["login", "register"]:
            return [AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=["post"])
    def login(self, request, *_, **__):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["put"])
    def logout(self, request, *_, **__):
        ActiveSession.objects.filter(user=request.user).delete()
        data = {"success": True, "msg": "Token revoked"}
        return Response(data=data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"])
    def register(self, request, *_, **__):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "success": True,
                "userID": user.id,
                "msg": "You were successfully registered 🎉",
            },
            status=status.HTTP_201_CREATED,
        )

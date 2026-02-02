from django.contrib.auth.models import Group
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from mainframe.api.groups.serializers import GroupSerializer
from mainframe.api.user.models import User


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all()
    permission_classes = (IsAdminUser,)
    serializer_class = GroupSerializer

    @action(detail=True, methods=["put"])
    def invite(self, request, *args, **kwargs):
        if not (email := self.request.data.get("email")):
            return Response(
                {"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        if not (user := User.objects.filter(email=email).first()):
            user = User.objects.create_user(email=email, username=email.split("@")[0])

        group: Group = self.get_object()
        if group.user_set.filter(email=user.email):
            return Response(
                {group.id: "User already in this group"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group.user_set.add(user)
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=["put"], url_path="remove-user")
    def remove_user(self, request, *args, **kwargs):
        if not (user_id := self.request.data.get("id")):
            return Response(
                {"detail": "User id required"}, status=status.HTTP_400_BAD_REQUEST
            )

        group: Group = self.get_object()
        if not group.user_set.filter(id=user_id).exists():
            return Response(
                {group.id: "User not in this group"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group.user_set.remove(user_id)
        return super().list(request, *args, **kwargs)

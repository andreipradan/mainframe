from django.db import IntegrityError
from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from mainframe.api.user.models import User
from mainframe.api.user.serializers import UserSerializer
from mainframe.expenses.models import Car, Expense, ExpenseGroup, ServiceEntry
from mainframe.expenses.serializers import (
    CarSerializer,
    ExpenseGroupSerializer,
    ExpenseSerializer,
    ServiceEntrySerializer,
)


class CarViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Car.objects.prefetch_related("service_entries")
    serializer_class = CarSerializer

    @action(methods=["patch", "post"], detail=True, url_path="service-entries")
    def service_entries(self, request, *args, **kwargs):
        obj = self.get_object()
        if request.method == "POST":
            serializer = ServiceEntrySerializer(data={"car": obj.id, **request.data})
            serializer.is_valid(raise_exception=True)
            try:
                obj = serializer.save()
            except IntegrityError:
                return JsonResponse(
                    status=status.HTTP_400_BAD_REQUEST,
                    data={
                        "message": f"{obj.name} service entry for "
                        f"{request.data.get('date')} already exists"
                    },
                )
        else:
            if not (service_entry_id := request.data.get("service_entry_id")):
                return JsonResponse(
                    status=status.HTTP_400_BAD_REQUEST,
                    data={"message": "service_entry_id is required"},
                )
            try:
                service_entry = obj.service_entries.get(id=service_entry_id)
            except ServiceEntry.DoesNotExist:
                return JsonResponse(
                    status=status.HTTP_400_BAD_REQUEST,
                    data={
                        "message": f"Service entry with id "
                        f"'{service_entry_id}' does not exist"
                    },
                )
            service_entry.delete()
        return Response(
            CarSerializer(self.get_object()).data, status=status.HTTP_201_CREATED
        )


class ExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = ExpenseSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return Expense.objects.order_by("-created_at")
        return self.request.user.expense_set.order_by("-created_at")

    def list(self, request, **kwargs):
        response = super().list(request, **kwargs)
        response.data["users"] = UserSerializer(User.objects.all(), many=True).data
        return response


class ExpenseGroupViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = ExpenseGroupSerializer

    def create(self, request, *args, **kwargs):
        data = {**request.data, "created_by": request.user.id}
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        group: ExpenseGroup = serializer.save()
        group.users.add(request.user)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def get_queryset(self):
        if self.request.user.is_staff:
            return ExpenseGroup.objects.order_by("name")
        return self.request.user.expense_groups.order_by("name")

    @action(detail=True, methods=["put"])
    def invite(self, request, *args, **kwargs):
        if not (email := self.request.data.get("email")):
            return Response(
                {"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        if not (user := User.objects.filter(email=email).first()):
            user = User.objects.create_user(email=email, username=email.split("@")[0])

        group: ExpenseGroup = self.get_object()
        if group.users.filter(email=user.email):
            return Response(
                {group.id: "User already in this group"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group.users.add(user)
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=["put"], url_path="remove-user")
    def remove_user(self, request, *args, **kwargs):
        if not (user_id := self.request.data.get("id")):
            return Response(
                {"detail": "User id required"}, status=status.HTTP_400_BAD_REQUEST
            )

        group: ExpenseGroup = self.get_object()
        if not group.users.filter(id=user_id).exists():
            return Response(
                {group.id: "User not in this group"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group.users.remove(user_id)
        return super().list(request, *args, **kwargs)

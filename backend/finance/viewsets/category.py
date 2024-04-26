from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

from finance.models import Category
from finance.serializers import CategorySerializer


class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Category.objects.order_by("id")
    serializer_class = CategorySerializer

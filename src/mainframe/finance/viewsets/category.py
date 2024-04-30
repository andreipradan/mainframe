from mainframe.finance.models import Category
from mainframe.finance.serializers import CategorySerializer
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser


class CategoryViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminUser,)
    queryset = Category.objects.order_by("id")
    serializer_class = CategorySerializer

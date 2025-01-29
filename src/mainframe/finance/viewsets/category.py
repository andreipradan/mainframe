from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser

from mainframe.finance.models import Category
from mainframe.finance.serializers import CategorySerializer


class CategoryPagination(PageNumberPagination):
    page_size = 300


class CategoryViewSet(viewsets.ModelViewSet):
    pagination_class = CategoryPagination
    permission_classes = (IsAdminUser,)
    queryset = Category.objects.order_by("id")
    serializer_class = CategorySerializer

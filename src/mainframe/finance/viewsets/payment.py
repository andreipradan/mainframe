from mainframe.clients.finance.payment import PaymentImportError, PaymentsImporter
from mainframe.clients.logs import get_default_logger
from mainframe.finance.models import Payment
from mainframe.finance.serializers import PaymentSerializer
from rest_framework import status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response


class PaymentPagination(PageNumberPagination):
    page_size = 250
    max_page_size = 250


class PaymentViewSet(viewsets.ModelViewSet):
    pagination_class = PaymentPagination
    permission_classes = (IsAdminUser,)
    queryset = Payment.objects.select_related("credit")
    serializer_class = PaymentSerializer

    def create(self, request, *args, **kwargs):
        file = request.FILES["file"]
        logger = get_default_logger(__name__)
        try:
            PaymentsImporter(file, logger).run()
        except PaymentImportError as e:
            logger.error("Could not process file: %s - error: %s", file, e)
            return Response(f"Invalid file: {file}", status.HTTP_400_BAD_REQUEST)
        return self.list(request, *args, **kwargs)

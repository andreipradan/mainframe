from rest_framework.pagination import PageNumberPagination


class MainframePagination(PageNumberPagination):
    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        response.data["page_size"] = self.page.paginator.per_page
        return response

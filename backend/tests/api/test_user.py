from django.urls import reverse
from rest_framework import status


class TestUserViewSet:

    def test_edit(self, client, db, session):
        data = {"email": "new@admin.com", "userID": session.user_id}
        url = reverse("api:user-edit-list")
        response = client.post(url,
                               data=data,
                               HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_200_OK

        response_data = response.json()
        assert response_data["success"] is True

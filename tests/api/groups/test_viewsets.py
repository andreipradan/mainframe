import pytest
from django.contrib.auth.models import Group
from rest_framework import status

from mainframe.api.user.models import User
from tests.factories.groups import GroupFactory
from tests.factories.user import UserFactory


@pytest.mark.django_db
class TestGroupViewSet:
    def test_list_groups(self, client, staff_session):
        """Test listing all groups - admin only"""
        GroupFactory(name="test-group-1")
        GroupFactory(name="test-group-2")

        response = client.get("/groups/", HTTP_AUTHORIZATION=staff_session.token)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 2
        names = {g["name"] for g in response.data["results"]}
        assert names == {"test-group-1", "test-group-2"}

    def test_list_groups_unauthorized(self, client, session):
        response = client.get("/groups/", HTTP_AUTHORIZATION=session.token)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_groups_unauthenticated(self, client):
        response = client.get("/groups/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_group(self, client, staff_session):
        data = {"name": "new-group"}

        response = client.post(
            "/groups/",
            data=data,
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "new-group"
        assert Group.objects.filter(name="new-group").exists()

    def test_retrieve_group(self, client, staff_session):
        group = GroupFactory(name="test-group")

        response = client.get(
            f"/groups/{group.id}/", HTTP_AUTHORIZATION=staff_session.token
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "test-group"

    def test_update_group(self, client, staff_session):
        group = GroupFactory(name="old-name")

        data = {"name": "new-name"}
        response = client.patch(
            f"/groups/{group.id}/",
            data=data,
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_200_OK
        group.refresh_from_db()
        assert group.name == "new-name"

    def test_delete_group(self, client, staff_session):
        group = GroupFactory(name="to-delete")
        group_id = group.id

        response = client.delete(
            f"/groups/{group_id}/", HTTP_AUTHORIZATION=staff_session.token
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Group.objects.filter(id=group_id).exists()

    def test_invite_user_new(self, client, staff_session):
        group = GroupFactory(name="test-group")

        data = {"email": "newuser@example.com"}
        response = client.put(
            f"/groups/{group.id}/invite/",
            data=data,
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert User.objects.filter(email="newuser@example.com").exists()
        user = User.objects.get(email="newuser@example.com")
        assert group.user_set.filter(id=user.id).exists()

    def test_invite_user_existing(self, client, staff_session):
        group = GroupFactory(name="test-group")
        user = UserFactory(email="existing@example.com")

        data = {"email": "existing@example.com"}
        response = client.put(
            f"/groups/{group.id}/invite/",
            data=data,
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert group.user_set.filter(id=user.id).exists()

    def test_invite_user_already_in_group(self, client, staff_session):
        group = GroupFactory(name="test-group")
        user = UserFactory(email="user@example.com")
        group.user_set.add(user)

        data = {"email": "user@example.com"}
        response = client.put(
            f"/groups/{group.id}/invite/",
            data=data,
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already in this group" in str(response.data)

    def test_invite_user_missing_email(self, client, staff_session):
        group = GroupFactory(name="test-group")

        data = {}
        response = client.put(
            f"/groups/{group.id}/invite/",
            data=data,
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email is required" in str(response.data)

    def test_remove_user_from_group(self, client, staff_session):
        group = GroupFactory(name="test-group")
        user = UserFactory(email="user@example.com")
        group.user_set.add(user)

        data = {"id": user.id}
        response = client.put(
            f"/groups/{group.id}/remove-user/",
            data=data,
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert not group.user_set.filter(id=user.id).exists()

    def test_remove_user_not_in_group(self, client, staff_session):
        group = GroupFactory(name="test-group")
        user = UserFactory(email="user@example.com")

        data = {"id": user.id}
        response = client.put(
            f"/groups/{group.id}/remove-user/",
            data=data,
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not in this group" in str(response.data)

    def test_remove_user_missing_id(self, client, staff_session):
        group = GroupFactory(name="test-group")

        data = {}
        response = client.put(
            f"/groups/{group.id}/remove-user/",
            data=data,
            HTTP_AUTHORIZATION=staff_session.token,
            content_type="application/json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "User id required" in str(response.data)

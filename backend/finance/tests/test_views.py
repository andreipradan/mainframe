import pytest
from django.contrib.auth.backends import UserModel
from django.urls import reverse

from finance.tests.factories import AccountFactory
from finance.tests.factories import CreditFactory
from finance.tests.factories import PaymentFactory
from finance.tests.factories import TransactionFactory


@pytest.fixture
def token(client):
    user_data = {"email": "foo@bar.com", "password": "password"}
    UserModel._default_manager.create_superuser(**user_data, username="foo@bar.com")
    response = client.post(reverse("users:login-list"), user_data)
    assert response.status_code == 200, response.json()
    return response.json()["token"]


@pytest.mark.django_db
class TestAccounts:
    def test_list(self, client, django_assert_num_queries, token):
        account1, account2, account3 = AccountFactory.create_batch(3)
        TransactionFactory.create_batch(2, account=account1)
        TransactionFactory(account=account2)
        with django_assert_num_queries(4):
            response = client.get(
                reverse("finance:accounts-list"), HTTP_AUTHORIZATION=token
            )
        assert response.status_code == 200
        assert set(response.json().keys()) == {"count", "next", "previous", "results"}
        assert [
            (x["id"], x["transaction_count"]) for x in response.json()["results"]
        ] == [(account1.id, 2), (account2.id, 1), (account3.id, 0)]


@pytest.mark.django_db
class TestCredit:
    def test_list(self, client, django_assert_num_queries, token):
        credit = CreditFactory()
        PaymentFactory.create_batch(3, credit=credit)
        with django_assert_num_queries(4):
            response = client.get(
                reverse("finance:credit-list"), HTTP_AUTHORIZATION=token
            )
        assert response.status_code == 200
        assert set(response.json().keys()) == {"credit", "latest_timetable"}


@pytest.mark.django_db
class TestPayments:
    def test_payment_list(self, client, django_assert_num_queries, token):
        PaymentFactory.create_batch(3)
        with django_assert_num_queries(4):
            response = client.get(
                reverse("finance:payments-list"), HTTP_AUTHORIZATION=token
            )
        assert response.status_code == 200

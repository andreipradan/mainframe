import pytest
from django.urls import reverse

from tests.factories.finance import (
    AccountFactory,
    CategoryFactory,
    CreditFactory,
    PaymentFactory,
    TransactionFactory,
)


@pytest.mark.django_db
class TestAccounts:
    def test_list(self, client, django_assert_num_queries, staff_session):
        account1, account2, account3 = AccountFactory.create_batch(3)
        TransactionFactory.create_batch(2, account=account1)
        TransactionFactory(account=account2)
        with django_assert_num_queries(4):
            response = client.get(
                reverse("finance:accounts-list"), HTTP_AUTHORIZATION=staff_session.token
            )
        assert response.status_code == 200
        assert set(response.json().keys()) == {
            "count",
            "next",
            "page_size",
            "previous",
            "results",
        }
        assert [
            (x["id"], x["transaction_count"]) for x in response.json()["results"]
        ] == [(account1.id, 2), (account2.id, 1), (account3.id, 0)]

    def test_analytics(self, client, django_assert_num_queries, staff_session):
        account = AccountFactory()
        c1, c2, c3 = [CategoryFactory(id=i) for i in ["foo", "bar", "baz"]]
        d1, d2, d3 = [
            "2021-02-03 00:00:00+00:00",
            "2021-02-06 00:00:00+00:00",
            "2021-05-03 00:00:00+00:00",
        ]
        TransactionFactory(
            account=account, category=c3, started_at="2022-03-04 00:00:00+00:00"
        )
        TransactionFactory(account=account, amount=-13, category=c1, started_at=d1)
        TransactionFactory(account=account, amount=-20, category=c1, started_at=d2)
        TransactionFactory(account=account, amount=-20, category=c2, started_at=d3)
        with django_assert_num_queries(6):
            response = client.get(
                reverse("finance:accounts-expenses", args=(account.id,)) + "?year=2021",
                HTTP_AUTHORIZATION=staff_session.token,
            )
        assert response.status_code == 200
        assert response.json() == {
            "categories": ["bar", "foo"],
            "per_month": [
                {"bar": "0", "baz": "0", "foo": "-33.00", "month": "February"},
                {"bar": "-20.00", "baz": "0", "foo": "0", "month": "May"},
            ],
            "total": 4,
            "years": [2021],
        }


@pytest.mark.django_db
class TestCredit:
    def test_list(self, client, django_assert_num_queries, staff_session):
        credit = CreditFactory()
        PaymentFactory.create_batch(3, credit=credit)
        with django_assert_num_queries(6):
            response = client.get(
                reverse("finance:credit-list"), HTTP_AUTHORIZATION=staff_session.token
            )
        assert response.status_code == 200
        assert set(response.json().keys()) == {
            "credit",
            "latest_timetable",
            "payment_stats",
            "rates",
        }


@pytest.mark.django_db
class TestPayments:
    def test_list(self, client, django_assert_num_queries, staff_session):
        PaymentFactory.create_batch(2)
        with django_assert_num_queries(4):
            response = client.get(
                reverse("finance:payments-list"), HTTP_AUTHORIZATION=staff_session.token
            )
        assert response.status_code == 200

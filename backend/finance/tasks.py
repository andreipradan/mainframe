import pandas as pd
from django.core.management import call_command
from huey import crontab
from huey.contrib.djhuey import HUEY, db_task, db_periodic_task
from huey.signals import SIGNAL_ERROR

from core.tasks import log_status
from clients.prediction import SKLearn
from finance.models import Category, Transaction


@db_task(expires=30)
def backup_finance_model(model):
    call_command("backup", app="finance", model=model)


@db_periodic_task(crontab(minute=59, hour=23, day=1))
@HUEY.lock_task("backup-finance-lock")
def backup_finance():
    call_command("backup", app="finance")


@db_task(expires=30)
def finance_import(doc_type, **kwargs):
    call_command(f"import_{doc_type}", **kwargs)


@db_task()
def predict(queryset, logger):
    total = queryset.count()
    logger.info("Predicting %d distinct descriptions", total)
    df = pd.DataFrame(queryset)
    predictions = SKLearn.predict(df)
    transactions = []
    for i, (item, category) in enumerate(zip(queryset, predictions)):
        transactions.append(Transaction(id=item["id"], category_suggestion_id=category))
        if i and not i % 1000:
            progress = i / total * 100
            log_status(
                "predict",
                operation="2/3 mapping predictions",
                progress=f"{progress / 2:.2f}",
            )

    logger.info("Bulk updating %d", len(transactions))
    log_status("predict", operation="3/3 saving to db", progress=70)
    Transaction.objects.bulk_update(
        transactions,
        fields=("category_suggestion_id",),
        batch_size=1000,
    )
    log_status("predict", operation=None, progress=100)
    logger.info("Done.")
    return transactions


@db_task(expires=10)
def train(logger):
    qs = (
        Transaction.objects.filter(
            amount__lt=0, confirmed_by=Transaction.CONFIRMED_BY_ML
        )
        .exclude(category=Category.UNIDENTIFIED)
        .values("description", "category")
    )
    count = qs.count()
    if not count:
        log_status("train", status=SIGNAL_ERROR, errors=["No trained data"])
        raise ValueError("No trained data")
    log_status("train", count=count)
    logger.info("Training on %d confirmed transactions...", count)
    df = pd.DataFrame(qs)
    return SKLearn.train(df, logger)

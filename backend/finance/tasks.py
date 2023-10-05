import pandas as pd
from huey.contrib.djhuey import HUEY, db_task
from huey.signals import SIGNAL_ERROR

from clients.prediction import SKLearn, log_status
from finance.models import Category, Transaction


@HUEY.signal()
def signal_expired(signal, task, exc=None):
    kwargs = {"task_type": task.name, "status": signal}
    if exc:
        kwargs["error"] = str(exc)
    log_status(**kwargs)


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
        log_status("train", status=SIGNAL_ERROR, error="No trained data")
        raise ValueError("No trained data")
    log_status("train", count=count)
    logger.info("Training on %d confirmed transactions...", count)
    df = pd.DataFrame(qs)
    return SKLearn.train(df, logger)

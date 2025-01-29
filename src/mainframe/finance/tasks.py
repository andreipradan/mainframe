from django.core.management import call_command
from huey.contrib.djhuey import db_task
from huey.signals import SIGNAL_ERROR

from mainframe.core.tasks import log_status
from mainframe.finance.models import Category, Transaction


@db_task(expires=30)
def backup_finance_model(model):
    call_command("backup", app="finance", model=model)


@db_task(expires=30)
def finance_import(doc_type, **kwargs):
    call_command(f"import_{doc_type}", **kwargs)


@db_task()
def predict(queryset, logger):
    import pandas as pd

    from mainframe.clients.prediction import SKLearn

    total = queryset.count()

    predictions = SKLearn.predict(pd.DataFrame(queryset))  # noqa: F821
    transactions = []
    for i, (item, category) in enumerate(zip(queryset, predictions, strict=False)):
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
    import pandas as pd

    from mainframe.clients.prediction import SKLearn

    qs = (
        Transaction.objects.expenses()
        .filter(confirmed_by=Transaction.CONFIRMED_BY_ML)
        .exclude(category=Category.UNIDENTIFIED)
        .values("description", "category")
    )
    count = qs.count()
    if not count:
        log_status("train", status=SIGNAL_ERROR, error="No trained data")
        raise ValueError("No trained data")
    log_status("train", count=count)
    logger.info("Training on %d confirmed transactions...", count)
    return SKLearn.train(pd.DataFrame(qs), logger)  # noqa: F821

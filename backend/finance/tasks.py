import json
import pickle

import pandas as pd
from django.conf import settings
from django.utils import timezone
from huey.contrib.djhuey import HUEY, db_task
from huey.signals import SIGNAL_ERROR
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

from camera.views import download_blob_into_memory
from clients.storage import upload_blob_from_string
from finance.models import Category, Transaction

redis_client = HUEY.storage.redis_client()


@HUEY.signal()
def signal_expired(signal, task, exc=None):
    kwargs = {"task_type": task.name, "status": signal}
    if exc:
        kwargs["error"] = str(exc)
    log_status(**kwargs)


def load(model_file_name):
    file = download_blob_into_memory(model_file_name, "GOOGLE_STORAGE_MODEL_BUCKET")
    return pickle.loads(file)


def log_status(task_type, **kwargs):
    new_event = {"timestamp": str(timezone.now()), **kwargs}

    details = json.loads(redis_client.get(task_type) or "{}")
    if not details:
        details = {"history": [new_event], **new_event}
    else:
        details.update(new_event)
        details["history"].insert(0, new_event)
    redis_client.set(task_type, json.dumps(details))
    return details


@db_task()
def predict(queryset, logger):
    total = queryset.count()
    logger.info(f"{total} distinct descriptions")

    model, vectorizer = load("latest_model.pkl"), load("latest_vectorizer.pkl")
    df = pd.DataFrame(queryset)
    predictions = model.predict(vectorizer.transform(df["description"]))

    transactions = []
    for i, (item, category) in enumerate(zip(queryset, predictions)):
        transactions.append(Transaction(id=item["id"], category_suggestion_id=category))
        if i and not i % 50:
            progress = i / total * 100
            logger.info(f"{progress:.2f}%")
            log_status("predict", progress=f"{progress / 2:.2f}")

    logger.info(f"Bulk updating {len(transactions)}")
    log_status("predict", progress=70)
    Transaction.objects.bulk_update(
        transactions,
        fields=("category_suggestion_id",),
        batch_size=1000,
    )
    log_status("predict", progress=100)
    logger.info("Done.")
    return transactions


def save(item, item_type, prefix, logger):
    upload_blob_from_string(
        string=pickle.dumps(item),
        destination=f"{item_type}.pkl",
        logger=logger,
        prefix=prefix,
    )


@db_task(expires=10)
def train(logger):
    qs = (
        Transaction.objects.filter(
            amount__lt=0, confirmed_by=Transaction.CONFIRMED_BY_ML
        )
        .exclude(category=Category.UNIDENTIFIED)
        .values("description", "category")
    )
    logger.info(f"Training on {qs.count()} confirmed transactions...")
    df = pd.DataFrame(qs)
    X_train, X_test, y_train, y_test = train_test_split(
        df["description"], df["category"], test_size=0.2, random_state=42
    )

    vect = TfidfVectorizer()
    X_train = vect.fit_transform(X_train)
    X_test = vect.transform(X_test)

    model = LogisticRegression()
    model.fit(X_train, y_train)

    accuracy = model.score(X_test, y_test)

    log_status("train", accuracy=accuracy)
    if accuracy < 0.95:
        log_status("train", status=SIGNAL_ERROR, accuracy=accuracy)
        return accuracy

    if settings.ENV != "local":
        prefix = f"{timezone.now():%Y_%m_%d_%H_%M_%S}_{accuracy}"
        save(model, "model", prefix, logger=logger)
        save(vect, "vectorizer", prefix, logger=logger)
    return accuracy

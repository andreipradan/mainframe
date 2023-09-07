import pickle

import pandas as pd
from django.utils import timezone
from huey.contrib.djhuey import task
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

from camera.views import download_blob_into_memory
from clients.storage import upload_blob_from_string
from finance.models import Category, Transaction


def load(model_file_name):
    file = download_blob_into_memory(model_file_name, "GOOGLE_STORAGE_MODEL_BUCKET")
    return pickle.loads(file)


@task()
def predict(queryset, logger):
    total = queryset.count()
    logger.info(f"{total} distinct descriptions")

    model, vectorizer = load("latest_model.pkl"), load("latest_vectorizer.pkl")
    df = pd.DataFrame(queryset)
    predictions = model.predict(vectorizer.transform(df["description"]))

    transactions = []
    for i, (item, category) in enumerate(zip(queryset, predictions)):
        transactions.append(Transaction(id=item["id"], category_suggestion_id=category))
        i and not i % 50 and logger.info(f"{i / total * 100:.2f}%")
    return transactions


def save(item, item_type, prefix, logger):
    upload_blob_from_string(
        string=pickle.dumps(item),
        destination=f"{item_type}.pkl",
        logger=logger,
        prefix=prefix,
    )


@task()
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

    if accuracy < 0.95:
        return accuracy

    prefix = f"{timezone.now():%Y_%m_%d_%H_%M_%S}_{accuracy}"
    save(model, "model", prefix, logger=logger)
    save(vect, "vectorizer", prefix, logger=logger)

    return accuracy

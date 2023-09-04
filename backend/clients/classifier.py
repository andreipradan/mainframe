import pickle

import pandas as pd
from django.utils import timezone
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

from camera.views import download_blob_into_memory
from clients.storage import upload_blob_from_file
from finance.models import Category, Transaction


def load(model_file_name):
    file = download_blob_into_memory(model_file_name, "GOOGLE_STORAGE_MODEL_BUCKET")
    return pickle.loads(file)


def predict(transactions):
    model, vectorizer = load("latest_model.pkl"), load("latest_vectorizer.pkl")
    df = pd.DataFrame(transactions.values("description"))
    predictions = model.predict(vectorizer.transform(df["description"]))

    for transaction, category in zip(transactions, predictions):
        transaction.category_suggestion_id = category
    return transactions


def save(item, item_type, prefix):
    name = f"{item_type}.pkl"
    with open(name, "wb") as file:
        pickle.dump(item, file)
    upload_blob_from_file(
        name, name, prefix=prefix, bucket_var="GOOGLE_STORAGE_MODEL_BUCKET"
    )


def train():
    df = pd.DataFrame(
        list(
            Transaction.objects.filter(amount__lt=0)
            .exclude(category=Category.UNIDENTIFIED)
            .exclude(
                confirmed_by=Transaction.CONFIRMED_BY_HUMAN,
            )
            .values("description", "category")
        )
    )
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
        raise ValueError(f"Accuracy too low: {accuracy}")

    prefix = f"{timezone.now():%Y_%m_%d_%H_%M_%S}/{accuracy}"
    save(model, "model", prefix)
    save(vect, "vectorizer", prefix)

    return accuracy

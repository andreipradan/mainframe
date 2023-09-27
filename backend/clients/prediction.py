import json
import pickle

import django.db.models
import pandas as pd
import numpy as np
import re
from django.conf import settings
from django.utils import timezone
from huey.contrib.djhuey import HUEY
from huey.signals import SIGNAL_ERROR

# import nltk
# nltk.download("punkt")
from nltk.tokenize import word_tokenize
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split

from camera.views import download_blob_into_memory
from clients.storage import upload_blob_from_string
from finance.models import Transaction, Category

redis_client = HUEY.storage.redis_client()


def clean_text(text):
    text = text.lower()
    text = re.sub(
        pattern=r"[^\w\s]|https?://\S+|www\.\S+|https?:/\S+|[^\x00-\x7F]+|\d+",
        repl="",
        string=str(text).strip(),
    )
    return " ".join(word_tokenize(text))


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


def load(file_name):
    file_name = f"{file_name}.pkl"
    if settings.ENV != "local":
        file = download_blob_into_memory(
            f"{file_name}.pkl", "GOOGLE_STORAGE_MODEL_BUCKET"
        )
        return pickle.loads(file)
    model_path = f"{settings.BASE_DIR}/finance/data/model"
    with open(f"{model_path}/{file_name}", "rb") as file:
        return pickle.load(file)


def save(item, item_type, prefix, logger):
    if settings.ENV != "local":
        return upload_blob_from_string(
            string=pickle.dumps(item),
            destination=f"{item_type}.pkl",
            logger=logger,
            prefix=prefix,
        )
    model_path = f"{settings.BASE_DIR}/finance/data/model"
    with open(f"{model_path}/latest_{item_type}.pkl", "wb") as file:
        pickle.dump(item, file)


class BERT:
    @classmethod
    def get_confirmed_df(cls):
        return pd.DataFrame(
            Transaction.objects.expenses()
            .filter(confirmed_by=Transaction.CONFIRMED_BY_ML)
            .exclude(category=Category.UNIDENTIFIED)
            .values("description", "category")
        )

    @classmethod
    def predict(cls, df):
        trained_embeddings = load("latest_bert_model")

        raw = df["description"]
        bert = raw.apply(clean_text)
        model = SentenceTransformer("paraphrase-mpnet-base-v2")
        texts = bert.tolist()
        embeddings = []
        total = len(texts)
        batch_size = int(total / 100)
        for i in range(0, total, batch_size):
            batch = texts[i : i + batch_size]
            text_embeddings = model.encode(
                batch, convert_to_numpy=True, show_progress_bar=False
            )[0]
            embeddings.append(text_embeddings)
            log_status(
                "predict",
                operation="1/3 predicting",
                progress=f"{i} / {total}",
            )
        # bert_test = np.array(model.encode(bert.tolist(), show_progress_bar=True))
        similarity_new_data = cosine_similarity(embeddings, trained_embeddings)
        index_similarity = pd.DataFrame(similarity_new_data).idxmax(axis=1)

        trained_df = cls.get_confirmed_df()
        data_inspect = trained_df.iloc[index_similarity, :].reset_index(drop=True)
        return (
            data_inspect["category"],
            data_inspect["description"],
            similarity_new_data.max(axis=1),
        )

    @classmethod
    def train(cls, logger):
        df = cls.get_confirmed_df()
        bert = df["description"].apply(clean_text)
        model = SentenceTransformer("paraphrase-mpnet-base-v2")
        embeddings = np.array(model.encode(bert.tolist(), show_progress_bar=True))

        prefix = f"{timezone.now():%Y_%m_%d_%H_%M_%S}"
        save(embeddings, "bert_model", prefix, logger)


class SKLearn:
    @classmethod
    def predict(cls, df) -> django.db.models.QuerySet:
        model, vectorizer = load("latest_model"), load("latest_vectorizer")
        return model.predict(vectorizer.transform(df["description"]))

    @classmethod
    def train(cls, df, logger):
        X_train, X_test, y_train, y_test = train_test_split(
            df["description"],  # .apply(clean_text),
            df["category"],
            test_size=0.2,
            random_state=42,
        )

        vect = TfidfVectorizer()
        X_train = vect.fit_transform(X_train)
        X_test = vect.transform(X_test)

        model = LogisticRegression()
        model.fit(X_train, y_train)

        accuracy = model.score(X_test, y_test)

        log_status("train", accuracy=f"{accuracy:.2f}")
        if accuracy < 0.95:
            error = f"Insufficient accuracy: {accuracy:.2f}"
            log_status("train", status=SIGNAL_ERROR, error=error)
            raise ValueError(error)

        prefix = f"{timezone.now():%Y_%m_%d_%H_%M_%S}_{accuracy}"
        save(model, "model", prefix, logger=logger)
        save(vect, "vectorizer", prefix, logger=logger)
        return accuracy

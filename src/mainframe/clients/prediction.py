import pickle

import django.db.models
from django.conf import settings
from django.utils import timezone
from huey.signals import SIGNAL_ERROR
from mainframe.camera.views import download_blob_into_memory
from mainframe.clients.storage import upload_blob_from_string
from mainframe.core.tasks import log_status


def load(file_name):
    file_name = f"{file_name}.pkl"
    if settings.ENV != "local":
        file = download_blob_into_memory(file_name, "GOOGLE_STORAGE_MODEL_BUCKET")
        return pickle.loads(file)  # noqa: S301
    model_path = f"{settings.BASE_DIR}/finance/data/model"
    with open(f"{model_path}/{file_name}", "rb") as file:
        return pickle.load(file)  # noqa: S301


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


class SKLearn:
    @classmethod
    def predict(cls, df) -> django.db.models.QuerySet:
        model, vectorizer = load("latest_model"), load("latest_vectorizer")
        return model.predict(vectorizer.transform(df["description"]))

    @classmethod
    def train(cls, df, logger):
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.model_selection import train_test_split

        X_train, X_test, y_train, y_test = train_test_split(  # noqa: F821
            df["description"],  # .apply(clean_text),
            df["category"],
            test_size=0.2,
            random_state=42,
        )

        vect = TfidfVectorizer()  # noqa: F821
        X_train = vect.fit_transform(X_train)
        X_test = vect.transform(X_test)

        model = LogisticRegression()  # noqa: F821
        model.fit(X_train, y_train)

        accuracy = model.score(X_test, y_test)

        log_status("train", accuracy=f"{accuracy:.2f}")
        if accuracy < 0.95:  # noqa PLR2004
            error = f"Insufficient accuracy: {accuracy:.2f}"
            log_status("train", status=SIGNAL_ERROR, errors=[error])
            raise ValueError(error)

        prefix = f"{timezone.now():%Y_%m_%d_%H_%M_%S}_{accuracy}"
        save(model, "model", prefix, logger=logger)
        save(vect, "vectorizer", prefix, logger=logger)
        return accuracy

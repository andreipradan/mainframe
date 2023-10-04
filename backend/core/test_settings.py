from .settings import *

DEBUG = False
ENV = "test"
SECRET_KEY = "test-key"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "test_db",
        "USER": "test_user",
        "PASSWORD": "test_pass",
        "HOST": "localhost",
        "PORT": 5433,
    }
}
TESTING = True

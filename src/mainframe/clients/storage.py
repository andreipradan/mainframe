import ast
import logging
import zlib

import environ
import redis
from google.cloud import storage

config = environ.Env()


class GoogleCloudStorageClient:
    def __init__(self, logger=None):
        self.client = storage.Client()
        self.logger = logger or logging.getLogger(__name__)

    def download_blob(self, blob_name, destination_path):
        bucket = self.client.bucket(config("GOOGLE_STORAGE_BUCKET"))
        bucket.blob(blob_name).download_to_filename(f"{destination_path}/{blob_name}")

    def download_blob_into_memory(self, blob_name, bucket_var=None):
        bucket = self.client.bucket(config(bucket_var or "GOOGLE_STORAGE_BUCKET"))
        return bucket.blob(blob_name).download_as_string()

    def list_blobs_with_prefix(self, prefix):
        bucket_name = self.client.bucket(config("GOOGLE_STORAGE_BUCKET"))
        return self.client.list_blobs(bucket_name, prefix=prefix, delimiter="/")

    def upload_blob_from_file(self, source, destination):
        self.logger.info("[Upload] %s - started", destination)
        bucket = self.client.bucket(config("GOOGLE_STORAGE_BACKUP_BUCKET"))
        try:
            bucket.blob(destination).upload_from_filename(source, if_generation_match=0)
        except ValueError as e:
            self.logger.error("[Upload] Error uploading '%s' - %s", destination, e)
        else:
            self.logger.info("[Upload] %s - completed", destination)
        finally:
            self.logger.info("[Upload] %s - Done", destination)

    def upload_blob_from_string(self, string, destination, prefix):
        destination = f"{prefix}_{destination}"
        self.logger.info("[Upload] %s started", destination)
        bucket = self.client.bucket(config("GOOGLE_STORAGE_MODEL_BUCKET"))
        blob = bucket.blob(destination)
        try:
            blob.upload_from_string(string)
        except ValueError as e:
            self.logger.error("[Upload] Error uploading '%s' - %s", destination, e)
        else:
            self.logger.info("[Upload] %s - completed", destination)
            bucket.copy_blob(blob, bucket, destination.replace(f"{prefix}_", "latest_"))
        finally:
            self.logger.info("[Upload] %s - Done", destination)


class RedisClient:
    def __init__(self, logger=None):
        self.client = redis.Redis(host="localhost", port=6379)
        self.logger = logger or logging.getLogger(__name__)

    def delete(self, key):
        self.client.delete(key)

    def get(self, key, compressed=True):
        try:
            if value := self.client.get(key):
                if compressed:
                    value = zlib.decompress(value)
                return ast.literal_eval(value.decode())
        except redis.exceptions.ConnectionError as e:
            self.logger.exception(e)

    def ping(self):
        return self.client.ping()

    def set(self, key, value, compressed=True):
        value = str(value).encode()
        if compressed:
            value = zlib.compress(value)
        self.client.set(key, value)

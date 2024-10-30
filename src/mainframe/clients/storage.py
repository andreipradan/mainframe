import environ
from google.cloud import storage

config = environ.Env()


def download_blob(blob_name, destination_path):
    storage_client = storage.Client()
    bucket = storage_client.bucket(config("GOOGLE_STORAGE_BUCKET"))
    bucket.blob(blob_name).download_to_filename(f"{destination_path}/{blob_name}")


def download_blob_into_memory(blob_name, bucket_var=None):
    storage_client = storage.Client()
    bucket = storage_client.bucket(config(bucket_var or "GOOGLE_STORAGE_BUCKET"))
    return bucket.blob(blob_name).download_as_string()


def list_blobs_with_prefix(prefix):
    storage_client = storage.Client()
    bucket_name = storage_client.bucket(config("GOOGLE_STORAGE_BUCKET"))
    return storage_client.list_blobs(bucket_name, prefix=prefix, delimiter="/")


def upload_blob_from_file(source, destination, logger):
    logger.info("[Upload] %s - started", destination)
    bucket = storage.Client().bucket(config("GOOGLE_STORAGE_BACKUP_BUCKET"))

    blob = bucket.blob(destination)
    try:
        blob.upload_from_filename(source, if_generation_match=0)
    except ValueError as e:
        logger.error("[Upload] Error uploading '%s' - %s", destination, e)

    else:
        logger.info("[Upload] %s - completed", destination)


def upload_blob_from_string(string, destination, logger, prefix):
    destination = f"{prefix}_{destination}"

    logger.info("[Upload] %s started", destination)
    bucket = storage.Client().bucket(config("GOOGLE_STORAGE_MODEL_BUCKET"))
    blob = bucket.blob(destination)
    try:
        blob.upload_from_string(string)
    except ValueError as e:
        logger.error("[Upload] Error uploading '%s' - %s", destination, e)
    else:
        logger.info("[Upload] %s - completed", destination)

    bucket.copy_blob(blob, bucket, destination.replace(f"{prefix}_", "latest_"))

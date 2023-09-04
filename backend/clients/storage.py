import logging

import environ
from google.cloud import storage

from clients.logs import MainframeHandler


def upload_blob_from_file(
    source, destination, logger=None, bucket_var=None, prefix=None
):
    logger = logger or logging.getLogger(__name__)
    logger.addHandler(MainframeHandler())
    destination = f"{f'{prefix}/' if prefix else ''}{destination}"
    logger.info(f"[Upload] {destination} - started")

    config = environ.Env()
    bucket_var = bucket_var or "GOOGLE_STORAGE_BACKUP_BUCKET"
    bucket = storage.Client().bucket(config(bucket_var))

    blob = bucket.blob(destination)
    try:
        blob.upload_from_filename(source, if_generation_match=0)
    except ValueError as e:
        logger.error(f"[Upload] Error uploading '{destination}' - {e}")
    else:
        logger.info(f"[Upload] {destination} - completed")

    if prefix:
        bucket.copy_blob(blob, bucket, destination.replace(f"{prefix}/", "latest_"))

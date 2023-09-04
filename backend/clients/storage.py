import environ
from google.cloud import storage


def upload_blob_from_file(source, destination, logger):
    logger.info(f"[Upload] {destination} - started")
    config = environ.Env()
    bucket = storage.Client().bucket(config("GOOGLE_STORAGE_BACKUP_BUCKET"))

    blob = bucket.blob(destination)
    try:
        blob.upload_from_filename(source, if_generation_match=0)
    except ValueError as e:
        logger.error(f"[Upload] Error uploading '{destination}' - {e}")
    else:
        logger.info(f"[Upload] {destination} - completed")


def upload_blob_from_string(string, destination, logger, prefix):
    destination = f"{prefix}_{destination}"

    logger.info(f"[Upload] {destination} started")
    config = environ.Env()
    bucket = storage.Client().bucket(config("GOOGLE_STORAGE_MODEL_BUCKET"))
    blob = bucket.blob(destination)
    try:
        blob.upload_from_string(string)
    except ValueError as e:
        logger.error(f"[Upload] Error uploading '{destination}' - {e}")
    else:
        logger.info(f"[Upload] {destination} - completed")

    bucket.copy_blob(blob, bucket, destination.replace(f"{prefix}_", "latest_"))

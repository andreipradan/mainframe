import environ
from google.cloud import storage


def upload_blob_from_file(source_file_name, destination_file_name, logger):
    logger.info(f"[Upload] {destination_file_name} - started")
    config = environ.Env()
    bucket = storage.Client().bucket(config("GOOGLE_STORAGE_BACKUP_BUCKET"))
    blob = bucket.blob(destination_file_name)
    try:
        blob.upload_from_filename(source_file_name, if_generation_match=0)
    except ValueError as e:
        logger.error(f"[Upload] Error uploading '{destination_file_name}' - {e}")
    else:
        logger.info(f"[Upload] {destination_file_name} - completed")

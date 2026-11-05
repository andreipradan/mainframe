import zlib
from unittest import mock

import pytest
from google.api_core.exceptions import GoogleAPICallError

from mainframe.clients import storage as storage_module


@pytest.fixture
def google_client():
    logger = mock.MagicMock()
    with mock.patch.object(storage_module.storage, "Client") as storage_client:
        client = storage_module.GoogleCloudStorageClient(logger=logger)
    client.client = storage_client.return_value
    return client, logger


class TestGoogleCloudStorageClient:
    @mock.patch("mainframe.clients.storage.config", return_value="bucket")
    def test_download_blob(self, _):
        logger = mock.MagicMock()
        with mock.patch.object(storage_module.storage, "Client") as storage_client:
            client = storage_module.GoogleCloudStorageClient(logger=logger)
        client.client = storage_client.return_value

        client.download_blob("archive/data.json", "destination")

        client.client.bucket.return_value.blob.assert_called_once_with(
            "archive/data.json"
        )
        client.client.bucket.return_value.blob.return_value.download_to_filename.assert_called_once_with(
            "destination/archive/data.json"
        )

    @pytest.mark.parametrize(
        ("bucket_var", "expected_bucket"),
        [
            (None, "GOOGLE_STORAGE_BUCKET"),
            ("GOOGLE_STORAGE_MODEL_BUCKET", "GOOGLE_STORAGE_MODEL_BUCKET"),
        ],
    )
    @mock.patch("mainframe.clients.storage.config")
    def test_download_blob_into_memory(self, config, bucket_var, expected_bucket):
        config.return_value = "bucket"
        client, _ = google_client_fixture()

        result = client.download_blob_into_memory("data.bin", bucket_var)

        config.assert_called_once_with(expected_bucket)
        blob = client.client.bucket.return_value.blob.return_value
        blob.download_as_string.assert_called_once_with()
        assert result == blob.download_as_string.return_value

    @mock.patch("mainframe.clients.storage.config", return_value="bucket")
    def test_list_blobs_with_prefix(self, _):
        client, _ = google_client_fixture()

        result = client.list_blobs_with_prefix("folder/")

        client.client.list_blobs.assert_called_once_with(
            client.client.bucket.return_value,
            prefix="folder/",
            delimiter="/",
        )
        assert result is client.client.list_blobs.return_value

    @mock.patch("mainframe.clients.storage.config", return_value="bucket")
    def test_upload_blob_from_file_success(self, _):
        client, logger = google_client_fixture()

        client.upload_blob_from_file("source", "archive")

        client.client.bucket.return_value.blob.return_value.upload_from_filename.assert_called_once_with(
            "source", if_generation_match=0
        )
        assert logger.info.call_count == 3
        logger.exception.assert_not_called()

    @mock.patch("mainframe.clients.storage.config", return_value="bucket")
    def test_upload_blob_from_file_logs_api_error(self, _):
        client, logger = google_client_fixture()
        blob = client.client.bucket.return_value.blob.return_value
        blob.upload_from_filename.side_effect = GoogleAPICallError("upload failed")

        client.upload_blob_from_file("source", "archive")

        logger.exception.assert_called_once()
        assert logger.info.call_count == 2

    @mock.patch("mainframe.clients.storage.config", return_value="bucket")
    def test_upload_blob_from_string_copies_latest(self, _):
        client, logger = google_client_fixture()
        blob = client.client.bucket.return_value.blob.return_value

        client.upload_blob_from_string("payload", "model.bin", "forecast")

        blob.upload_from_string.assert_called_once_with("payload")
        client.client.bucket.return_value.copy_blob.assert_called_once_with(
            blob, client.client.bucket.return_value, "latest_model.bin"
        )
        assert logger.info.call_count == 3

    @mock.patch("mainframe.clients.storage.config", return_value="bucket")
    def test_upload_blob_from_string_does_not_copy_on_api_error(self, _):
        client, logger = google_client_fixture()
        blob = client.client.bucket.return_value.blob.return_value
        blob.upload_from_string.side_effect = GoogleAPICallError("upload failed")

        client.upload_blob_from_string("payload", "model.bin", "forecast")

        client.client.bucket.return_value.copy_blob.assert_not_called()
        logger.exception.assert_called_once()
        assert logger.info.call_count == 2


class TestRedisClient:
    @pytest.fixture
    def redis_client(self):
        logger = mock.MagicMock()
        with mock.patch.object(storage_module.redis, "Redis") as redis_class:
            client = storage_module.RedisClient(logger=logger)
        client.client = redis_class.return_value
        return client, logger

    def test_delete_and_ping(self, redis_client):
        client, _ = redis_client

        client.delete("key")

        client.client.delete.assert_called_once_with("key")
        assert client.ping() is client.client.ping.return_value

    def test_get_decompresses_and_parses_value(self, redis_client):
        client, _ = redis_client
        client.client.get.return_value = zlib.compress(b"{'value': 1}")

        assert client.get("key") == {"value": 1}
        client.client.get.assert_called_once_with("key")

    def test_get_parses_uncompressed_value(self, redis_client):
        client, _ = redis_client
        client.client.get.return_value = b"['value']"

        assert client.get("key", compressed=False) == ["value"]

    def test_get_returns_none_for_missing_key(self, redis_client):
        client, _ = redis_client
        client.client.get.return_value = None

        assert client.get("key") is None

    def test_get_logs_connection_error(self, redis_client):
        client, logger = redis_client
        client.client.get.side_effect = storage_module.redis.exceptions.ConnectionError(
            "unavailable"
        )

        assert client.get("key") is None
        logger.exception.assert_called_once_with("Error connecting to Redis", key="key")

    @pytest.mark.parametrize("compressed", [True, False])
    def test_set_serializes_value(self, redis_client, compressed):
        client, _ = redis_client

        client.set("key", {"value": 1}, compressed=compressed)

        stored_value = client.client.set.call_args.args[1]
        if compressed:
            stored_value = zlib.decompress(stored_value)
        assert stored_value == b"{'value': 1}"
        client.client.set.assert_called_once_with(
            "key", client.client.set.call_args.args[1]
        )


def google_client_fixture():
    logger = mock.MagicMock()
    with mock.patch.object(storage_module.storage, "Client") as storage_client:
        client = storage_module.GoogleCloudStorageClient(logger=logger)
    client.client = storage_client.return_value
    return client, logger

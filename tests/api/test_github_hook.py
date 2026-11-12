import hashlib
import hmac
import json
from ipaddress import ip_address
from unittest import mock

import pytest
from django.conf import settings
from django.test import RequestFactory
from rest_framework import status
from rest_framework.exceptions import MethodNotAllowed

from mainframe.api.hooks.github import (
    _validate_response,
    _verify_signature,
    mainframe,
)


@pytest.fixture
def github_patches():
    response = mock.MagicMock(status_code=status.HTTP_200_OK)
    response.json.return_value = {"hooks": ["192.0.2.0/24"]}
    with (
        mock.patch(
            "mainframe.api.hooks.github.requests.get", return_value=response
        ) as get,
        mock.patch("mainframe.api.hooks.github.environ.Env") as env_class,
        mock.patch("mainframe.api.hooks.github.send_telegram_message") as send,
    ):
        env_class.return_value.return_value = "token"
        yield response, get, send


def make_request(payload, event="push", signature=True, method="POST"):
    body = json.dumps(payload).encode()
    headers = {"HTTP_X_FORWARDED_FOR": "192.0.2.10"}
    if event:
        headers["HTTP_X_GITHUB_EVENT"] = event
    if signature:
        digest = hmac.new(
            settings.SECRET_KEY.encode(), body, digestmod=hashlib.sha256
        ).hexdigest()
        headers["HTTP_X_HUB_SIGNATURE_256"] = f"sha256={digest}"
    return getattr(RequestFactory(), method.lower())(
        "/hooks/github/", data=body, content_type="application/json", **headers
    )


def test_validate_response_rejects_non_success_status():
    response = mock.MagicMock(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    with (
        mock.patch("mainframe.api.hooks.github.send_telegram_message") as send,
    ):
        assert not _validate_response(response, "192.0.2.10")

    send.assert_called_once()
    response.json.assert_not_called()


def test_validate_response_rejects_unlisted_ip():
    response = mock.MagicMock(status_code=status.HTTP_200_OK)
    response.json.return_value = {"hooks": ["198.51.100.0/24"]}
    with mock.patch("mainframe.api.hooks.github.send_telegram_message"):
        assert not _validate_response(response, ip_address("192.0.2.10"))


def test_validate_response_accepts_github_ip():
    response = mock.MagicMock(status_code=status.HTTP_200_OK)
    response.json.return_value = {"hooks": ["192.0.2.0/24"]}

    assert _validate_response(response, ip_address("192.0.2.10"))


@pytest.mark.parametrize(
    ("header", "signature", "expected"),
    [
        (None, None, False),
        ("HTTP_X_HUB_SIGNATURE_256", "sha256=bad", False),
        ("HTTP_X_HUB_SIGNATURE_256", "sha1=bad", False),
        ("HTTP_X_HUB_SIGNATURE_256", "invalid", False),
        ("HTTP_X_HUB_SIGNATURE", "sha1=bad", False),
    ],
)
def test_verify_signature_rejects_invalid_signatures(header, signature, expected):
    request = mock.MagicMock(body=b"payload")
    request.META = {}
    if header:
        request.META[header] = signature
    with mock.patch("mainframe.api.hooks.github.send_telegram_message"):
        assert _verify_signature(request) is expected


def test_verify_signature_accepts_valid_signature():
    body = b"payload"
    digest = hmac.new(
        settings.SECRET_KEY.encode(), body, digestmod=hashlib.sha256
    ).hexdigest()
    request = mock.MagicMock(body=body)
    request.META = {"HTTP_X_HUB_SIGNATURE_256": f"sha256={digest}"}

    assert _verify_signature(request)


def test_mainframe_rejects_non_post_request(github_patches):
    request = RequestFactory().get("/hooks/github/")

    with pytest.raises(MethodNotAllowed):
        mainframe(request)

    _, get, _ = github_patches
    get.assert_not_called()


def test_mainframe_rejects_non_github_ip(github_patches):
    response, _, _ = github_patches
    response.json.return_value = {"hooks": ["198.51.100.0/24"]}
    request = make_request({})

    result = mainframe(request)

    assert result.status_code == status.HTTP_403_FORBIDDEN
    assert result.content == b"Failed to validate GitHub IPs"


def test_mainframe_rejects_missing_signature(github_patches):
    request = make_request({}, signature=False)

    result = mainframe(request)

    assert result.status_code == status.HTTP_403_FORBIDDEN
    assert result.content == b"Permission denied."


def test_mainframe_sends_push_notification(github_patches):
    _, _, send = github_patches
    request = make_request(
        {
            "pusher": {"name": "Alice"},
            "compare": "https://example.test/compare",
            "ref": "refs/heads/main",
        }
    )

    result = mainframe(request)

    assert result.status_code == status.HTTP_200_OK
    assert result.content == b"pong"
    send.assert_called_once_with(
        text="<b>Alice</b> pushed "
        "<a target='_blank' href='https://example.test/compare'>new changes</a> "
        "on the <b>main</b> branch",
        parse_mode="HTML",
    )


@pytest.mark.parametrize(
    ("head_branch", "action", "conclusion"),
    [
        ("develop", "completed", "success"),
        ("main", "in_progress", None),
        ("main", "completed", "failure"),
    ],
)
def test_mainframe_ignores_non_deploy_workflow_events(
    github_patches, head_branch, action, conclusion
):
    _, _, send = github_patches
    request = make_request(
        {
            "action": action,
            "workflow_job": {
                "workflow_name": "Mainframe pipeline",
                "name": "BE - Deploy",
                "head_branch": head_branch,
                "conclusion": conclusion,
                "html_url": "https://example.test/job",
            },
        },
        event="workflow_job",
    )
    with mock.patch("mainframe.api.hooks.github.schedule_deploy") as deploy:
        result = mainframe(request)

    assert result.status_code == 204
    deploy.assert_not_called()
    send.assert_not_called()


def test_mainframe_schedules_successful_deploy(github_patches):
    _, _, send = github_patches
    request = make_request(
        {
            "action": "completed",
            "workflow_job": {
                "workflow_name": "Mainframe pipeline",
                "name": "BE - Deploy",
                "head_branch": "main",
                "conclusion": "success",
                "html_url": "https://example.test/job",
            },
        },
        event="workflow_job",
    )
    task = mock.MagicMock()
    task.get.return_value = "Deployment queued"
    with mock.patch(
        "mainframe.api.hooks.github.schedule_deploy", return_value=task
    ) as deploy:
        result = mainframe(request)

    assert result.status_code == 204
    deploy.assert_called_once_with()
    send.assert_called_once()
    assert "Deployment queued" in send.call_args.kwargs["text"]

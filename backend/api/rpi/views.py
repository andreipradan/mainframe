from django.conf import settings
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from clients.system import run_cmd


class RpiViewSet(viewsets.ViewSet):
    permission_classes = (IsAuthenticated,)

    @staticmethod
    def run_command(cmd):
        try:
            output = run_cmd(cmd)
        except RuntimeError as e:
            return JsonResponse(status=400, data={"data": str(e)})

        return JsonResponse(status=204, data={"data": output})

    @action(detail=False, methods=["put"], url_path="clear-build")
    def clear_build(self, request, **kwargs):
        return self.run_command(f"rm -rf {settings.BASE_DIR / 'build'}")

    @action(detail=False, methods=["put"])
    def reboot(self, request, **kwargs):
        return self.run_command("sudo reboot -f")

    @action(detail=False, methods=["put"], url_path="restart-backend")
    def restart_backend(self, request, **kwargs):
        return self.run_command(f"sudo systemctl restart backend")

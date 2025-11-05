from django.http import JsonResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser

from mainframe.api.huey_tasks.management.commands.set_tasks import set_tasks
from mainframe.clients.system import run_cmd


class RpiViewSet(viewsets.ViewSet):
    permission_classes = (IsAdminUser,)

    @staticmethod
    def run_command(cmd):
        try:
            output = run_cmd(cmd)
        except RuntimeError as e:
            return JsonResponse(
                status=status.HTTP_400_BAD_REQUEST, data={"data": str(e)}
            )

        return JsonResponse(status=status.HTTP_204_NO_CONTENT, data={"data": output})

    @action(detail=False, methods=["put"])
    def reboot(self, request, **kwargs):
        return self.run_command("sudo reboot -f")

    @action(detail=False, methods=["put"], url_path="reset-tasks")
    def reset_tasks(self, request, **kwargs):
        set_tasks()
        return JsonResponse(status=status.HTTP_204_NO_CONTENT, data={})

    @action(detail=False, methods=["put"], url_path="restart-service")
    def restart_service(self, request, **kwargs):
        return self.run_command(f"sudo systemctl restart {request.data['service']}")

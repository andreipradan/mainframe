#!/bin/bash

echo "📡 Install Wi-Fi auto-repair"

SCRIPT_PATH="/usr/local/bin/wifi-repair.sh"
SERVICE_PATH="/etc/systemd/system/wifi-repair.service"
TIMER_PATH="/etc/systemd/system/wifi-repair.timer"
HOOK_PATH="/usr/local/bin/wifi-repair-hook.sh"
PROJECT_DIR=${HOME}/projects/mainframe

# main script
cat << 'EOF' > $SCRIPT_PATH
#!/bin/bash

GATEWAY="192.168.1.1"
PUBLIC_DNS="8.8.8.8"
INTERFACE="wlan0"
BOOT_WAIT_SEC=120

UPTIME=$(cut -d. -f1 /proc/uptime)
if [ "$UPTIME" -lt "$BOOT_WAIT_SEC" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Skipping check (just booted)" | systemd-cat -t wifi-repair
    exit 0
fi

ping -c 1 -W 1 $GATEWAY > /dev/null
GW_OK=$?

ping -c 1 -W 1 $PUBLIC_DNS > /dev/null
NET_OK=$?

if [ $GW_OK -ne 0 ] && [ $NET_OK -ne 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Wi-Fi offline. Restarting $INTERFACE..." | systemd-cat -t wifi-repair
    ip link set $INTERFACE down 2>/dev/null || ifconfig $INTERFACE down
    sleep 2
    ip link set $INTERFACE up 2>/dev/null || ifconfig $INTERFACE up
    dhclient $INTERFACE
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Interface $INTERFACE restarted." | systemd-cat -t wifi-repair

    echo "$(date '+%Y-%m-%d %H:%M:%S') - Restarting services" | systemd-cat -t wifi-repair
    "${PROJECT_DIR}/deploy/setup.sh noreq restart"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Wi-Fi OK (GW: $GW_OK, NET: $NET_OK)" | systemd-cat -t wifi-repair
fi
EOF

chmod +x $SCRIPT_PATH

# .service
cat << EOF > $SERVICE_PATH
[Unit]
Description=Wi-Fi auto-repair if disconnected
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=$SCRIPT_PATH
EOF

# .timer
cat << EOF > $TIMER_PATH
[Unit]
Description=Runs Wi-Fi repair every 5 minutes

[Timer]
OnBootSec=3min
OnUnitActiveSec=5min
Unit=wifi-repair.service

[Install]
WantedBy=timers.target
EOF

# activate the timer
systemctl daemon-reload
systemctl enable --now wifi-repair.timer

echo "✅ Done!"
echo "📜 logs: journalctl -t wifi-repair -n 20"

#!/bin/bash

GATEWAY="192.168.1.1"
PUBLIC_DNS="8.8.8.8"
INTERFACE="wlan0"
BOOT_WAIT_SEC=120

UPTIME=$(cut -d. -f1 /proc/uptime)
if [ "$UPTIME" -lt "$BOOT_WAIT_SEC" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Skipping check (just booted)"
    exit 0
fi

ping -c 1 -W 1 $GATEWAY > /dev/null
GW_OK=$?

ping -c 1 -W 1 $PUBLIC_DNS > /dev/null
NET_OK=$?

if [ $GW_OK -ne 0 ] && [ $NET_OK -ne 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Wi-Fi offline. Restarting $INTERFACE..."
    ip link set $INTERFACE down 2>/dev/null || ifconfig $INTERFACE down
    sleep 2
    ip link set $INTERFACE up 2>/dev/null || ifconfig $INTERFACE up
    dhclient $INTERFACE
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Interface $INTERFACE restarted."

    echo "$(date '+%Y-%m-%d %H:%M:%S') - Restarting services"
    "${PROJECT_DIR}/deploy/setup.sh noreq restart"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Wi-Fi OK (GW: $GW_OK, NET: $NET_OK)"
fi

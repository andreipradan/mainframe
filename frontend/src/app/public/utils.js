import L from "leaflet";
import {TileLayer} from "react-leaflet";
import React from "react";

export const vehicleTypes = {
  0: "Tram, Streetcar, Light rail",
  1: "Subway, Metro",
  2: "Rail",
  3: "Bus",
  4: "Ferry",
  5: "Cable tram",
  6: "Aerial lift",
  7: "Funicular",
  11: "Trolleybus",
  12: "Monorail",
}

export const getDirectedRoute = (tripId, routeName) => {
  if (!tripId || !routeName) return routeName
  const [start, end] = routeName.split(" - ")
  return tripId.split("_")[1] === "0"
    ? `${start} > ${end}`
    : `${end} > ${start}`
}

export const getIconByType = (bus, route) => {
  const vType = vehicleTypes[bus.vehicle_type]?.toLowerCase()
  let color = "#3199b0"
  if (route?.route_short_name?.[0] === "M")
    color = "#9f611b"
  else if (bus.bike_accessible === "BIKE_ACCESSIBLE")
    color = "#e5a823"
  else if (vType !== "bus") {
    color = "#42c41d"
  }

  let label = route?.route_short_name || `? ${bus.label}`
  let labelWidth = 15 * label.length
  if (bus.bike_accessible === "BIKE_ACCESSIBLE") {
    label += "🚴"
    labelWidth += 10
  }
  if (bus.wheelchair_accessible === "WHEELCHAIR_ACCESSIBLE") {
    label += "♿"
    labelWidth += 10
  }
  if (route?.route_short_name === "9" && bus.bike_accessible === "BIKE_ACCESSIBLE" && bus.wheelchair_accessible === "WHEELCHAIR_ACCESSIBLE")
    labelWidth += 10
  return new L.divIcon({
    html: `<div style="
                position:absolute;
                bottom:-5px;
                right:-5px;
                background:${color};
                color:white;
                font-size:12px;
                font-weight:bold;
                width:${labelWidth}px;
                min-width: 25px;
                height:20px;
                border-radius:20%;
                display:flex;
                align-items:center;
                justify-content:center;
                box-shadow:0 1px 3px rgba(0,0,0,0.4);
              ">
                ${label}
              </div>`,
    className: "custom-bus-icon",
    iconAnchor: [16, 24],
});
}

export const tileLayer = {
  true: <TileLayer
    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />,
  false: <TileLayer
    attribution='&copy; OpenStreetMap contributors &copy; CARTO'
    url="https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png"
  />
}

export const timeSince = date => {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return `${Math.floor(interval)} years`;
  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)} months`;
  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)} days`;
  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)} hours`;
  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)} minutes`;
  return `${Math.floor(seconds)} seconds`;
}

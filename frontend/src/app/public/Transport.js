import React, {useEffect, useRef, useState} from 'react'
import { useDispatch, useSelector } from "react-redux";

import { Form } from "react-bootstrap";
import { MapContainer, Marker, Popup, Polyline, Tooltip, useMap } from "react-leaflet";
import { Circles } from "react-loader-spinner";

import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

import "leaflet/dist/leaflet.css";
import "leaflet.fullscreen";
import "leaflet.fullscreen/Control.FullScreen.css";

import Errors from "../shared/Errors";
import { TransitApi } from "../../api/transport";
import {
  getDirectedRoute,
  getIconByType,
  getNumberIcon,
  tileLayer,
  timeSince
} from "./utils";
import { toast } from "react-toastify";
import { toastParams } from "../../api/auth";

const POLLING_DISABLED_AFTER_SECONDS = 240
const entities = ["vehicles", "routes", "shapes", "stops", "stop_times", "trips"];

const FullscreenControl = () => {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    const control = L.control.fullscreen({
      position: "topright",
      title: "Fullscreen",
      titleCancel: "Exit Fullscreen",
      forceSeparateButton: true,
    })
    control.addTo(map)
    return () => map.removeControl(control)
  }, [map])
  return null
}
const Transport = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const state = useSelector(state => state.transit)

  const api = new TransitApi(token)

  const [fieldsBus, setFieldsBus] = useState(null)
  const [fieldsStop, setFieldsStop] = useState(null)

  // refs
  const firstTimeBusFields = useRef(true)
  const firstTimeStopFields = useRef(true)
  const mapRef = useRef(null);

  const [fetchEntity, setFetchEntity] = useState(entities[1])

  const [mode, setMode] = useState("buses");
  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null)

  const [toggleActive, setToggleActive] = useState(true)
  const [toggleBikes, setToggleBikes] = useState(false)
  const [toggleFields, setToggleFields] = useState(false)
  const [toggleLabels, setToggleLabels] = useState(false)
  const [toggleMapType, setToggleMapType] = useState(false)
  const [toggleMetro, setToggleMetro] = useState(false)
  const [togglePollingEnabled, setTogglePollingEnabled] = useState(true)
  const [toggleWheelchair, setToggleWheelchair] = useState(false)

  useEffect(() => {
    if (mode === "stops") {
      setTogglePollingEnabled(false)
    }
  }, [mode]);
  // set right panel field toggles
  useEffect(() => {
    if (firstTimeBusFields.current && state.vehicles?.[0]) {
      setFieldsBus(Object.keys(state.vehicles?.[0])?.map(k => ({
        key: k,
        value: false
      })))
      firstTimeBusFields.current = false
    }
  }, [state.vehicles]);
  useEffect(() => {
    if (firstTimeStopFields.current && state.stop_times?.[0]) {
      setFieldsStop(Object.keys(state.stop_times[0])?.map(k => ({
        key: k,
        value: false
      })))
      firstTimeStopFields.current = false
    }
  }, [state.stop_times]);

  const stateRef = useRef(state);
  const startPollingTimeRef = useRef(null);
  useEffect(() => {stateRef.current = state}, [state]);

  const [countdown, setCountdown] = useState(POLLING_DISABLED_AFTER_SECONDS); // seconds left
  const lastFetchRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      // If polling isn’t enabled or hasn’t started yet, reset to full timeout
      if (!togglePollingEnabled || !startPollingTimeRef.current) {
        setCountdown(POLLING_DISABLED_AFTER_SECONDS);
        return;
      }
      const secondsSinceStarted = (Date.now() - startPollingTimeRef.current) / 1000;
      const remaining = Math.max(POLLING_DISABLED_AFTER_SECONDS - secondsSinceStarted, 0);
      setCountdown(Math.ceil(remaining));
    };

    // update twice a second
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [togglePollingEnabled]);

  // initial
  useEffect(() => {
    const fetchTransit = async (what = "vehicles") => {
      const etag = stateRef.current[`${what}_etag`];
      if (stateRef.current.loading) return
      if (togglePollingEnabled && startPollingTimeRef.current && Date.now() - startPollingTimeRef.current > POLLING_DISABLED_AFTER_SECONDS * 1000 ) {
        startPollingTimeRef.current = null
        setTogglePollingEnabled(false)
        toast.warning(<span>Polling disabled - Press <i className="mdi mdi-play" /> to start it back </span>, toastParams)

        return
      }
      dispatch(api.getList(what, etag));
      lastFetchRef.current = Date.now()
    };

    if (togglePollingEnabled) {
      entities.forEach(fetchTransit);
      startPollingTimeRef.current = new Date()
    }
    else return

    let interval;
    if (togglePollingEnabled) {
      interval = setInterval(() => fetchTransit("vehicles"), 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dispatch, togglePollingEnabled]);

  const getRoute = routeId => state.routes ? state.routes.find(r => r.route_id === routeId) : null
  const getStop = stopId => state.stops ? state.stops.find(s => s.stop_id === stopId) : null

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Public Transport</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Transport</li>
          </ol>
        </nav>
      </div>
      <div className="row">
        <div className={`col-lg-${toggleFields ? '9' : '12'} grid-margin stretch-card`}>
          <div className="card">
            <div className="card-body">
              <h4 className="card-title mb-1">
                Live Map &nbsp;
                <button type="button" className={`btn btn-outline-${toggleMapType ? 'success': 'danger'} btn-sm border-0 bg-transparent`} onClick={() => setToggleMapType(!toggleMapType)}>
                  <i className={`mdi mdi-map${toggleMapType ? '-check' : ''}`} />
                </button> &nbsp;
                {
                  mode === "buses"
                    ? <>
                      <button
                        type="button"
                        className={`btn btn-outline-${togglePollingEnabled ? 'success' : 'danger'} btn-sm border-0 bg-transparent`}
                        onClick={() => setTogglePollingEnabled(!togglePollingEnabled)}
                      >
                        <i className={`mdi mdi-${togglePollingEnabled ? 'pause-circle-outline' : 'play-circle-outline'}`} />
                      </button> &nbsp;
                      {
                        !selectedVehicle
                          ? <>
                            <button
                              type="button"
                              className={`btn btn-outline-${toggleActive ? 'success' : 'danger'} btn-sm border-0 bg-transparent`}
                              onClick={() => setToggleActive(!toggleActive)}
                            >
                              <i className="mdi mdi-bus" />
                            </button> &nbsp;
                            <button
                              type="button"
                              className={`btn btn-outline-${toggleBikes ? 'success' : 'danger'} btn-sm border-0 bg-transparent`}
                              onClick={() => setToggleBikes(!toggleBikes)}
                            >
                              <i className="mdi mdi-bike" />
                            </button> &nbsp;
                            <button
                              type="button"
                              className={`btn btn-outline-${toggleWheelchair ? 'success' : 'danger'} btn-sm border-0 bg-transparent`}
                              onClick={() => setToggleWheelchair(!toggleWheelchair)}
                            >
                              <i className="mdi mdi-wheelchair" />
                            </button> &nbsp;
                            <button
                              type="button"
                              className={`btn btn-outline-${toggleMetro ? 'success' : 'danger'} btn-sm border-0 bg-transparent`}
                              onClick={() => setToggleMetro(!toggleMetro)}
                            >
                              <b>M</b>
                            </button> &nbsp;
                          </>
                          : null
                      }
                    </>
                    : null
                }
                {
                  selectedVehicle
                    ? <button
                        type="button"
                        className={`btn btn-outline-${toggleLabels ? 'success' : 'danger'} btn-sm border-0 bg-transparent`}
                        onClick={() => setToggleLabels(!toggleLabels)}
                      >
                        <i className="mdi mdi-label" />
                      </button>
                    : null
                }
                &nbsp;<button
                  type="button"
                  className={`btn btn-outline-${toggleFields ? 'success' : 'danger'} btn-sm border-0 bg-transparent`}
                  onClick={() => setToggleFields(!toggleFields)}
                >
                  <i className="mdi mdi-cog" />
                </button> &nbsp;
                {
                  state.loading
                    ? <Circles
                        visible
                        height={18}
                        width={18}
                        wrapperClass="btn"
                        wrapperStyle={{display: "default"}}
                        ariaLabel="ball-triangle-loading"
                        color='orange'
                      />
                    : null
                }
              </h4>
              <Errors errors={state.errors}/>
              <div ref={mapRef} style={{ height: '75vh', width: '100%' }}>
                <MapContainer
                  center={[46.77, 23.59]}
                  zoom={14}
                  style={{ height: "100%", width: "100%" }}
                  preferCanvas
                >
                  {tileLayer[toggleMapType]}
                  {
                    mode !== "stops" && state.vehicles?.filter(
                      b => b.latitude && b.longitude
                    ).filter(
                      b => selectedVehicle
                        ? b.id === selectedVehicle.id
                        : b
                    ).filter(
                      b => toggleActive
                        ? b.trip_id
                        : b
                    ).filter(
                      b => toggleBikes
                        ? b.bike_accessible === "BIKE_ACCESSIBLE"
                        : b
                    ).filter(
                      b => toggleWheelchair
                        ? b.wheelchair_accessible === "WHEELCHAIR_ACCESSIBLE"
                        : b
                    ).filter(
                      b => toggleMetro
                        ? getRoute(b.route_id)?.route_short_name[0] === "M"
                        : b
                    ).filter(
                      b => search
                        ? getRoute(b.route_id)?.route_short_name?.toLowerCase()?.includes(search.trim())
                        : b
                    ).map(bus =>
                      <Marker
                        key={bus.id}
                        position={[bus.latitude, bus.longitude]}
                        icon={getIconByType(bus, getRoute(bus.route_id))}
                        eventHandlers={{
                          popupopen: () => setSelectedVehicle(bus),
                          popupclose: () => setSelectedVehicle(null),
                        }}
                      >
                        <Popup offset={[-20, -25]}>
                          <strong>{getRoute(bus.route_id)?.route_short_name || bus.label}</strong> {getDirectedRoute(bus.trip_id, getRoute(bus.route_id)?.route_long_name)}<br />
                          <strong>Speed:</strong> {bus.speed} km/h<br/>
                          <strong>Updated</strong> {timeSince(new Date(bus.timestamp))} ago<br/>
                          {
                            fieldsBus?.filter(f => f.value).map(f => <div key={f.key}>
                              <strong>{f.key}</strong> {bus[f.key]}
                            </div>)
                          }
                        </Popup>
                      </Marker>
                    )
                  }
                  {
                    selectedVehicle && state.shapes
                      ? <Polyline positions={state.shapes.filter(s => s.shape_id ===selectedVehicle.trip_id ).map(s => [s.shape_pt_lat, s.shape_pt_lon])} color="blue" weight={4} />
                      : null
                  }
                  {
                    selectedVehicle && state.stop_times && state.stops
                      ? state.stop_times.filter(st => st.trip_id === selectedVehicle.trip_id).map(st =>
                        <Marker
                          key={`${st.trip_id}-${st.stop_id}-${st.stop_sequence}`}
                          position={[getStop(st.stop_id).stop_lat, getStop(st.stop_id).stop_lon]}
                          icon={getNumberIcon(st.stop_sequence)}
                        >
                          {
                            toggleLabels
                              ? <Tooltip direction="right" offset={[7, -15]} opacity={1} permanent={true}>
                                  <strong>{getStop(st.stop_id).stop_name}</strong>
                                </Tooltip>
                              : null
                          }
                        </Marker>)
                      : null
                  }
                  {
                    mode === "stops" && <MarkerClusterGroup
                      chunkedLoading
                      disableClusteringAtZoom={16}
                      maxClusterRadius={20}
                    >
                      {
                        state.stops?.filter(
                          s => search
                            ? s.stop_name.toLowerCase().trim().includes(search.trim().toLowerCase())
                            : s
                        ).map(s =>
                          <Marker
                            key={s.stop_id}
                            position={[s.stop_lat, s.stop_lon]}
                            icon={new L.divIcon({
                              html: '<i class="mdi mdi-map-marker" style="font-size:24px;color:#3f2a2a;"></i>',
                              className: "custom-bus-icon",
                              iconAnchor: [16, 24],
                            })}
                          >
                            <Popup>
                              <strong>{s.stop_name}</strong><br/>
                              <strong>{s.stop_desc}</strong>
                              {
                                state.stop_times?.filter(st => st.stop_id === s.stop_id).map(st => <div key={st.trip_id}>
                                  <strong>{state.routes?.find(r => r.route_id === state.trips?.find(t => t.trip_id === st.trip_id)?.route_id)?.route_short_name}:</strong>&nbsp;
                                  {state.trips?.filter(t => t.trip_id === st.trip_id).map(t => <span key={t.trip_id}>{t.trip_headsign}</span>)}
                                  {fieldsStop?.filter(f => f.value).map(f => ` ${f.key}: ${st[f.key]} `)}
                                </div>)
                              }
                            </Popup>
                        </Marker>)
                      }
                    </MarkerClusterGroup>
                  }

                  {/* Controls overlay */}
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      left: "50%",
                      position: "absolute",
                      top: "10px",
                      transform: "translateX(-50%)",
                      zIndex: 1000,
                    }}
                  >
                    {/* Search */}
                    <input
                      type="text"
                      placeholder={`Search ${mode === "buses" ? "bus line" : "stop"}...`}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setSearch("");
                      }}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                      }}
                    />
                    {
                      search && <button
                        onClick={() => setSearch("")}
                        style={{
                          position: "absolute",
                          right: "75px",
                          top: "50%",
                          transform: "translateY(-55%)",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "14px",
                          color: "#888",
                        }}
                      >
                        ×
                      </button>
                    }

                    {/* Switch */}
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: "8px",
                        border: "1px solid #ccc",
                      }}
                    >
                      <option value="buses">Buses</option>
                      <option value="stops">Stops</option>
                    </select>
                    <div
                      style={{
                        background: "gray",
                        borderRadius: "5px",
                        border: "none",
                        left: 2,
                        opacity: "90%",
                        padding: "6px",
                        position: "absolute",
                        top: "120%",
                      }}
                    >
                      <div className={`${!togglePollingEnabled ? 'mb-2 ' : ''}text-small`}>
                        Checked {state.vehicles_last_check ? timeSince(new Date(state.vehicles_last_check)) : '-'}
                      </div>
                      <div>
                        Updated {
                          state.vehicles_last_update
                            ? <span
                                className={
                                  `text-small text-${
                                    togglePollingEnabled
                                      ? Math.floor((new Date() - new Date(state.vehicles_last_update)) / 1000) >= 15
                                        ? Math.floor((new Date() - new Date(state.vehicles_last_update)) / 1000) >= 40
                                          ? 'danger'
                                          : 'warning'
                                        : 'success'
                                      : 'secondary'}`
                              }>
                                {timeSince(new Date(state.vehicles_last_update))}
                              </span>
                            : '-'
                        }
                      </div>
                      {
                        togglePollingEnabled
                          ? <div>Polling: {countdown} seconds left</div>
                          : null
                      }
                    </div>
                  </div>
                  <FullscreenControl />
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
        {
          toggleFields && <>
            <div className={`col-lg-${toggleFields ? '3' : '0'} grid-margin stretch-card`}>
              <div className="card">
                <div className="card-body">
                  <div className="mb-2">
                    <h4 className="card-title">Actions</h4>
                    <button
                      type="button"
                      className={`mr-1 btn btn-outline-warning btn-sm bg-transparent`}
                      onClick={() => dispatch(api.getList(fetchEntity, state[`${fetchEntity}_etag`]))}
                    >
                      <i className="mdi mdi-download-outline" /> Fetch
                    </button>
                    <select
                      value={fetchEntity}
                      onChange={(e) => setFetchEntity(e.target.value)}
                      style={{ padding: "2px 3px", borderRadius: "8px" }}
                    >
                      {
                        entities.map(e => <option key={e}>{e}</option>)
                      }
                    </select>
                    <div className={
                      `mt-1 text-small text-${
                        Math.floor((new Date() - new Date(state[`${fetchEntity}_last_update`])) / 1000) >= 15
                          ? Math.floor((new Date() - new Date(state[`${fetchEntity}_last_update`])) / 1000) >= 40
                            ? 'danger'
                            : 'warning'
                          : 'success'
                      }`
                    }>
                      Last {fetchEntity} update: {
                        state[`${fetchEntity}_last_update`]
                          ? timeSince(new Date(state[`${fetchEntity}_last_update`]))
                          : '-'
                      }
                    </div>
                    <div className={"text-small text-muted"}>
                      Last {fetchEntity} check: {
                        state[`${fetchEntity}_last_check`]
                          ? timeSince(new Date(state[`${fetchEntity}_last_check`]))
                          : '-'
                      }
                    </div>
                  </div>
                  <h4 className="card-title">Bus fields</h4>
                  {
                    mode === "buses" && fieldsBus?.map(fieldConfig =>
                      <Form.Check
                        key={fieldConfig.key}
                        checked={Boolean(fieldsBus?.find(f => f.key === fieldConfig.key)?.value)}
                        type="switch"
                        id={`checkbox-toggle-${fieldConfig.key}`}
                        label={`${
                          fieldConfig.key.includes("_")
                            ? `${fieldConfig.key.split("_")[0]} ${fieldConfig.key.split("_")[1]}`
                            : fieldConfig.key
                        }`}
                        onChange={
                          () =>
                            setFieldsBus(
                              fieldsBus.map(
                                f => f.key === fieldConfig.key
                                  ? ({key: f.key, value: !f.value})
                                  : f
                              )
                            )
                        }
                      />
                      )
                  }
                  {
                    toggleFields && mode === "stops"
                      ? <>
                        <br/>
                        <h4 className="card-title">Stop fields</h4>
                        {
                          fieldsStop?.map(fieldConfig =>
                            <Form.Check
                              key={fieldConfig.key}
                              checked={Boolean(fieldsStop?.find(f => f.key === fieldConfig.key)?.value)}
                              type="switch"
                              id={`checkbox-fields-stop-${fieldConfig.key}`}
                              label={`${
                                fieldConfig.key.includes("_")
                                  ? `${fieldConfig.key.split("_")[0]} ${fieldConfig.key.split("_")[1]}`
                                  : fieldConfig.key
                              }`}
                              onChange={
                                () =>
                                  setFieldsStop(
                                    fieldsStop.map(
                                      f => f.key === fieldConfig.key
                                        ? ({key: f.key, value: !f.value})
                                        : f
                                    )
                                  )
                              }
                            />
                            )
                        }
                        </>
                      : null
                  }
                </div>
              </div>
            </div>
          </>
        }
      </div>
    </div>
  )
}

export default Transport;

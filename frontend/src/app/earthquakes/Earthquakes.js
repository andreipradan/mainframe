import React, { useEffect, useLayoutEffect, useState } from 'react';
import { BallTriangle, Circles } from "react-loader-spinner";
import { useDispatch, useSelector } from "react-redux";

import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import mapGeodata from "@amcharts/amcharts5-geodata/romaniaHigh";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import Alert from "react-bootstrap/Alert";

import BotsApi from "../../api/bots";
import BottomPagination from "../shared/BottomPagination";
import EarthquakesApi from "../../api/earthquakes";
import { Bar } from "react-chartjs-2";
import { API_SERVER } from "../../constants";
import { setKwargs } from "../../redux/earthquakesSlice";

const defaultButtonProps = {
  paddingTop: 10,
  paddingBottom: 10,
  x: am5.percent(100),
  centerX: am5.percent(100),
  opacity: 0,
  interactiveChildren: false,
}

export const formatDate = timestamp => new Date(timestamp).toLocaleDateString(
  "ro-RO", {day: "2-digit", month: 'short', year: '2-digit'}
)
export const formatTime = timestamp => new Date(timestamp).toLocaleDateString(
    "ro-RO",
    {day: "2-digit", month: "short", year: "2-digit", hour: "numeric", minute: "numeric"}
)

const Earthquakes = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const earthquakes = useSelector(state => state.earthquakes)
  const earthquakesList = earthquakes.results ? [...earthquakes.results].reverse() : null

  const api = new EarthquakesApi(token)

  const [alertOpen, setAlertOpen] = useState(false)
  useEffect(() => {setAlertOpen(!!earthquakes.errors)}, [earthquakes.errors])

  const data = {
    labels: earthquakesList?.map(e =>formatTime(e.timestamp)),
    datasets: [
      {
        label: 'Magnitude',
        data: earthquakesList?.map(e => e.magnitude),
        backgroundColor: context => {
          if (earthquakesList?.[context.dataIndex].additional_data?.sols?.primary?.region?.type === "world")
            return "rgba(114,167,203,0.25)"
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, 'rgba(255, 99, 132, 0.2)');
          gradient.addColorStop(0.5, 'rgb(255,210,64, 0.2)');
          gradient.addColorStop(1, 'rgba(75,192,126,0.2)');
          return gradient;
        },
        borderColor: context => {
          if (earthquakesList?.[context.dataIndex].additional_data?.sols?.primary?.region?.type === "world")
            return "gray"
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, context.height || 100);
          gradient.addColorStop(0, 'rgba(255,99,132,1)');
          gradient.addColorStop(0.5, 'rgb(255,210,64, 1)');
          gradient.addColorStop(1, 'rgb(75,192,126)');
          return gradient;
        },
        borderWidth: 1,
        fill: false,
      },
    ]
  }

  const options = {
    scales: {
      yAxes: [{
        ticks: {beginAtZero: true, step: 20},
        gridLines: {color: "rgba(204, 204, 204,0.1)"}
      }],
      xAxes: [{gridLines: {color: "rgba(204, 204, 204,0.1)"}}]
    },
    elements: {point: {radius: 0}},
    tooltips: {
      callbacks: {
        title: tooltipItem =>
            `${earthquakesList?.[tooltipItem[0].index].location}\n${tooltipItem[0].label}`,
      }
    }
  }

  const [series, setSeries] = useState(null)
  const [root, setRoot] = useState(null)
  const [chart, setChart] = useState(null)

  useLayoutEffect(() => {
    const root = am5.Root.new("map")
    setRoot(root)
    root.setThemes([am5themes_Animated.new(root)])
    let chart = root.container.children.push(am5map.MapChart.new(root, {projection: am5map.geoNaturalEarth1()}))
    setChart(chart)

    const countySeries = chart.series.push(am5map.MapPolygonSeries.new(root, {visible: false}));
    countySeries.mapPolygons.template.setAll({
      tooltipText: "{name}",
      interactive: true
    });
    countySeries.mapPolygons.template.states.create("hover", {fill: am5.color("#5b76b6")})



    const series = generateSeries(root, chart)
    setSeries(series)
    series.mapPolygons.template.events.on("click", ev => {
      series.zoomToDataItem(ev.target.dataItem).waitForStop()
      am5.net.load(
        API_SERVER + "earthquakes/map/?id=" + ev.target.dataItem.dataContext.id,
      ).then((result) => {
        countySeries.setAll({geoJSON: am5.JSONParser.parse(result.response)});
        countySeries.show()
        series.hide()
      }).catch(function(result) {
        console.log("Error loading " + result.xhr.responseURL);
      });
    })

    createZoomControl(root, chart)
    const homeButton = chart.children.push(am5.Button.new(root, {
      ...defaultButtonProps,
      scale: 0.75,
      icon: am5.Graphics.new(root, {
        svgPath: "M16,8 L14,8 L14,16 L10,16 L10,10 L6,10 L6,16 L2,16 L2,8 L0,8 L8,0 L16,8 Z M16,8",
        fill: am5.color(0xffffff)
      })
    }));
    homeButton.events.on("click", () => {
      series.show()
      chart.goHome()
    })
    homeButton.show()
    return () => root.dispose()
  }, [])

  const createZoomControl = (root, chart) => {
    const zoomControl = am5map.ZoomControl.new(root, {});
    chart.set("zoomControl", zoomControl)
    zoomControl.minusButton.set("scale", 0.75)
    zoomControl.plusButton.set("scale", 0.75)
  }

  const generateSeries = (root, chart) => {
    const settings = {geoJSON: mapGeodata}
    const series = chart.series.push(am5map.MapPolygonSeries.new(root, settings))
    const template = series.mapPolygons.template
    template.setAll(
      {
        tooltipText: "{name}",
        interactive: true,
        templateField: "columnSettings",
      })
    template.states.create("hover", {fill: am5.color("#5b76b6")})

    return series
  }

  const zoomToGeoPoint = event => {

    const pointSeries = chart.series.push(am5map.MapPointSeries.new(root, {}))

    let colorSet = am5.ColorSet.new(root, {step:2});
    pointSeries.bullets.push(function(root, series, dataItem) {
      let value = dataItem.dataContext.value;

      let container = am5.Container.new(root, {});
      let color = colorSet.next();
      let radius = 1 + value;
      container.children.push(am5.Circle.new(root, {
        radius: radius -1,
        fill: value < 3 ? 'green' : value < 4 ? 'orange' : value < 5 ? 'darkorange' : 'red',
        dy: -radius * 2
      }))

      container.children.push(am5.Line.new(root, {
        stroke: color,
        height: -20,
        strokeGradient: am5.LinearGradient.new(root, {
          stops:[
            { opacity: 1 },
            { opacity: 1 },
            { opacity: 0 }
          ]
        })
      }));

      container.children.push(am5.Label.new(root, {
        fontSize: radius,
        text: value,
        fill: am5.color(0xffffff),
        centerX: am5.p50,
        centerY: am5.p50,
        dy: -radius * 2
      }))

      return am5.Bullet.new(root, {sprite: container})});

    pointSeries.data.push({
      geometry: { type: "Point", coordinates: [event.longitude, event.latitude] },
      title: event.location,
      value: event.magnitude
    });

    series.chart.zoomToGeoPoint({latitude: event.latitude, longitude: event.longitude}, 5, 1)

  }

  return <div>
    <div className="page-header">
     <h3 className="page-title">Earthquakes</h3>
     <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
          <li className="breadcrumb-item active" aria-current="page">Earthquakes</li>
        </ol>
      </nav>
    </div>

    {alertOpen && <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>
      {earthquakes.errors?.detail}
    </Alert>}
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Latest Earthquakes
              <button type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={
                  () => {
                    dispatch(api.getList(earthquakes.kwargs))
                    dispatch(new BotsApi(token).getList())
                  }
                }>
                <i className="mdi mdi-refresh" />
              </button>
              <div className="form-check float-right ml-4">
                <label className="form-check-label text-muted">
                  <input type="checkbox" className="form-check-input" onChange={() => dispatch(setKwargs({local_events: !earthquakes.kwargs.local_events}))} checked={earthquakes.kwargs.local_events}/>
                  <i className="input-helper" />
                  Only local events
                </label>
              </div>
              <div className="form-check float-right ml-4">
                <label className="form-check-label text-muted">
                  <input type="checkbox" className="form-check-input" onChange={() => dispatch(setKwargs({magnitude_gt5: !earthquakes.kwargs.magnitude_gt5}))} checked={earthquakes.kwargs.magnitude_gt5}/>
                  <i className="input-helper" />
                  > 5 ML
                </label>
              </div>
              <div className="form-check float-right">
                <label className="form-check-label text-muted">
                  <input type="checkbox" className="form-check-input" onChange={() => dispatch(setKwargs({largest_events: !earthquakes.kwargs.largest_events}))} checked={earthquakes.kwargs.largest_events}/>
                  <i className="input-helper" />
                  Largest events
                </label>
              </div>
            </h4>
            <p className="card-description d-flex">
              Last check:&nbsp;
              {earthquakes.loading
                ? <Circles
                    visible={true}
                    height="15"
                    width="100%"
                    ariaLabel="ball-triangle-loading"
                    wrapperStyle={{}}
                    wrapperClass={{}}
                    color='orange'
                  />
                : <span> {earthquakes.last_check || "-"}</span>
              }
            </p>
            <div className="row">
              <div className="col-md-12">
                {
                  earthquakes.loading ?
                    <BallTriangle
                      visible={true}
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{}}
                      wrapperClass={{}}
                      color = '#e15b64'
                    />
                  : <Bar
                      data={data}
                      options={options}
                      height={100}
                      onElementsClick={(e) => e?.[0]?._index && zoomToGeoPoint(earthquakesList?.[e[0]._index])}
                    />
                }
              </div>
            </div>
            <div className="row mt-3">
              <div className="col-md-7">
                <div className="table-responsive table-hover" style={{overflow: "auto", maxHeight: "40vh"}}>
                  <table className="table" >
                    <thead>
                    <tr style={{position: "sticky", top: 0, zIndex: 1}} className="bg-gray-dark">
                      <th> Time </th>
                      <th> Magnitude </th>
                      <th> Location </th>
                      <th> Depth </th>
                      <th> Location </th>
                      <th> Source </th>
                    </tr>
                    </thead>
                    <tbody style={{maxHeight: "100px", overflowY: "scroll"}}>
                    {
                      earthquakes.results?.map((e, i) => <tr key={i} onClick={() => zoomToGeoPoint(e)}>
                        <td>
                          {formatTime(e.timestamp)}
                          {
                            e.additional_data?.sols?.primary?.receiveTime
                              ? <p className="small">Rec: {formatTime(e.additional_data.sols.primary.receiveTime)}</p>
                              : null
                          }
                        </td>
                        <td className={
                          e.magnitude < 5
                            ? "text-success"
                            : e.magnitude < 6
                              ? "text-warning"
                              : "text-danger"
                        }>
                          {e.magnitude} {e.intensity ? `(${e.intensity})` : null}
                        </td>
                        <td>
                          <a rel="noopener noreferrer" target="_blank" href={`https://www.google.com/maps/place/${e.latitude}+${e.longitude}`}><i className="mdi mdi-map" /></a>
                        </td>
                        <td className="font-weight-medium"> {parseFloat(e.depth).toFixed(2)} km </td>
                        <td className="font-weight-medium"> {e.location} </td>
                        <td> {e.source} </td>
                      </tr>)
                    }
                    </tbody>
                  </table>
                </div>
                <BottomPagination items={earthquakes} fetchMethod={api.getList} newApi={true} setKwargs={setKwargs} />

              </div>
              <div className="col-md-5">
                <div id="map" style={{ width: "100%", height: "350px" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
}

export default Earthquakes;
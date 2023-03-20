import React, { useEffect, useLayoutEffect, useState } from 'react';
import { BallTriangle, Circles } from "react-loader-spinner";
import { useDispatch, useSelector } from "react-redux";

import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
import mapGeodata from "@amcharts/amcharts5-geodata/romaniaHigh";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

import EarthquakesApi from "../../api/earthquakes";
import { Bar } from "react-chartjs-2";
import {API_SERVER} from "../../constants";
import BotsApi from "../../api/bots";

const defaultButtonProps = {
  paddingTop: 10,
  paddingBottom: 10,
  x: am5.percent(100),
  centerX: am5.percent(100),
  opacity: 0,
  interactiveChildren: false,
}


const options = {
  scales: {
    yAxes: [{ticks: {beginAtZero: true, step: 20}, gridLines: {color: "rgba(204, 204, 204,0.1)"}}],
    xAxes: [{gridLines: {color: "rgba(204, 204, 204,0.1)"}}]
  },
  elements: {point: {radius: 0}},
}


const Earthquakes = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {count, loading, next, previous, results: earthquakes} = useSelector(state => state.earthquakes)
  const {results: bots, loading: botsLoading} = useSelector(state => state.bots)
  const earthquakesList = earthquakes ? [...earthquakes].reverse() : null

  const data = {
    labels: earthquakesList?.map(e => new Date(e.timestamp).toLocaleDateString() + " " + new Date(e.timestamp).toLocaleTimeString()),
    datasets: [{
      label: 'Magnitude',
      data: earthquakesList?.map(e => e.magnitude),
      backgroundColor: context => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(255, 99, 132, 0.2)');
        gradient.addColorStop(0.5, 'rgb(255,210,64, 0.2)');
        gradient.addColorStop(1, 'rgba(75,192,126,0.2)');
        return gradient;
      },
      borderColor: context => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, context.height || 100);
        gradient.addColorStop(0, 'rgba(255,99,132,1)');
        gradient.addColorStop(0.5, 'rgb(255,210,64, 1)');
        gradient.addColorStop(1, 'rgb(75,192,126)');
        return gradient;
      },
      borderWidth: 1,
      fill: false
    }]
  }
  const [series, setSeries] = useState(null)
  const [root, setRoot] = useState(null)
  const [chart, setChart] = useState(null)

  const currentPage = !previous ? 1 : (parseInt(new URL(previous).searchParams.get("page")) || 1) + 1
  const lastPage = Math.ceil(count / earthquakes?.length)

  useEffect(() => {
    !earthquakes && dispatch(EarthquakesApi.getList(token))
    !bots && dispatch(BotsApi.getList(token))
  }, [dispatch, earthquakes, token]);

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
      scale: .75,
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
    zoomControl.minusButton.set("scale", .75)
    zoomControl.plusButton.set("scale", .75)
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
      let radius = 7 + value;
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

  const lastCheck = bots?.find(b => !!b.additional_data?.earthquake)?.additional_data.earthquake.last_check

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
                            dispatch(EarthquakesApi.getList(token))
                            dispatch(BotsApi.getList(token))
                          }
                        }>
                  <i className="mdi mdi-refresh"></i>
                </button>
              </h4>
              <p className="card-description d-flex">
                Last check:&nbsp;
                {botsLoading
                  ? <Circles
                      visible={true}
                      height="15"
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{}}
                      wrapperClass={{}}
                      color='orange'
                    />
                  : <span> {lastCheck || "-"}</span>
                }
              </p>
              <div className="row">
                <div className="col-md-12">
                  {
                    loading ?
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
                        onElementsClick={(e) => e?.[0]?._index && zoomToGeoPoint(earthquakesList[e[0]._index])}
                      />
                  }
                </div>
              </div>
              <div className="row">
                <div className="col-md-7">
                  <div className="table-responsive table-hover" style={{overflow: "auto", maxHeight: "40vh"}}>
                    <table className="table" >
                      <thead>
                      <tr style={{position: "sticky", top: 0, zIndex: 1}} className="bg-gray-dark">
                        <th> Time </th>
                        <th> Magnitude </th>
                        <th> Location </th>
                        <th> Depth </th>
                        <th> Source </th>
                      </tr>
                      </thead>
                      <tbody style={{maxHeight: "100px", overflowY: "scroll"}}>
                      {
                        earthquakes?.map((e, i) => <tr key={i} onClick={() => zoomToGeoPoint(e)}>
                          <td>
                            {new Date(e.timestamp).toLocaleDateString() + " " + new Date(e.timestamp).toLocaleTimeString()}
                          </td>
                          <td> {e.magnitude} {e.intensity ? `(${e.intensity})` : null}</td>
                          <td>
                            <a rel="noopener noreferrer" target="_blank" href={`https://www.google.com/maps/place/${e.latitude}+${e.longitude}`}><i className="mdi mdi-map" /></a>
                          </td>
                          <td className="font-weight-medium"> {e.depth} km </td>
                          <td> {e.source_verbose} </td>
                        </tr>)
                      }
                      </tbody>
                    </table>
                  </div>
                  <div className="center-content btn-group mt-4 mr-4" role="group" aria-label="Basic example">
                    <button
                      type="button"
                      className="btn btn-default"
                      disabled={!previous}
                      onClick={() => dispatch(EarthquakesApi.getList(token, 1))}
                    >
                      <i className="mdi mdi-skip-backward"/>
                    </button>

                    {
                      !next && currentPage - 2 > 0 &&
                      <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => dispatch(EarthquakesApi.getList(token, currentPage - 2))}
                      >
                        {currentPage - 2}
                      </button>
                    }
                    {
                      previous &&
                      <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => dispatch(EarthquakesApi.getList(token, currentPage - 1))}
                      >
                        {currentPage - 1}
                      </button>
                    }
                    <button
                      type="button"
                      className="btn btn-default"
                      disabled
                    >
                      {currentPage}
                    </button>
                    {
                      next &&
                      <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => dispatch(EarthquakesApi.getList(token, currentPage + 1))}
                      >
                        {currentPage + 1}
                      </button>
                    }
                    {
                      !previous && currentPage + 2 < lastPage &&
                      <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => dispatch(EarthquakesApi.getList(token, currentPage + 2))}
                      >
                        {currentPage + 2}
                      </button>
                    }
                    <button
                      type="button"
                      className="btn btn-default"
                      disabled={!next}
                      onClick={() => dispatch(EarthquakesApi.getList(token, lastPage))}
                    >
                      <i className="mdi mdi-skip-forward"/>
                    </button>
                  </div>
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
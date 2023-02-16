import React, { useEffect, useLayoutEffect, useState } from 'react';
import { BallTriangle } from "react-loader-spinner";
import { useDispatch, useSelector } from "react-redux";

import * as am5 from "@amcharts/amcharts5";
import * as am5map from "@amcharts/amcharts5/map";
// import mapGeodata from "@amcharts/amcharts5-geodata/worldHigh";
import mapGeodata from "@amcharts/amcharts5-geodata/romaniaHigh";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

import EarthquakesApi from "../../api/earthquakes";
import { Bar } from "react-chartjs-2";

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
    yAxes: [{ticks: {beginAtZero: true}, gridLines: {color: "rgba(204, 204, 204,0.1)"}}],
    xAxes: [{gridLines: {color: "rgba(204, 204, 204,0.1)"}}]
  },
  elements: {point: {radius: 0}}
}

const colors = {

}

const Earthquakes = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const earthquakes = useSelector(state => state.earthquakes)

  const earthquakesList = earthquakes.list ? [...earthquakes.list].reverse() : null

  const data = {
    labels: earthquakesList?.map(e => new Date(e.timestamp).toLocaleDateString() + " " + new Date(e.timestamp).toLocaleTimeString()),
    datasets: [{
      label: 'Magnitude',
      data: earthquakesList?.map(e => e.magnitude),
      backgroundColor: earthquakesList?.map(e =>
          e.magnitude < 2
              ? 'rgba(75, 192, 192, 0.2)'
              : e.magnitude < 3
                  ? 'rgba(54, 162, 235, 0.2)'
                  : e.magnitude < 4
                      ? 'rgba(255, 206, 86, 0.2)'
                      : e.magnitude < 5
                        ? 'rgba(255, 159, 64, 0.2)'
                        : 'rgba(255, 99, 132, 0.2)'
      ),
      borderColor: earthquakesList?.map(e =>
          e.magnitude < 2.5
              ? 'rgba(75, 192, 192, 1)'
              : e.magnitude < 3
                  ? 'rgba(54, 162, 235, 1)'
                  : e.magnitude < 4
                      ? 'rgba(255, 206, 86, 1)'
                      : e.magnitude < 5
                        ? 'rgba(255, 159, 64, 1)'
                        : 'rgba(255,99,132,1)'
      ),
      borderWidth: 1,
      fill: false
    }]
  }
  // const [series, setSeries] = useState(null)

  useEffect(() => {
    !earthquakes.list && dispatch(EarthquakesApi.getList(token));
  }, []);


  // useLayoutEffect(() => {
  //   const root = am5.Root.new("map")
  //   root.setThemes([am5themes_Animated.new(root)])
  //
  //   let chart = root.container.children.push(
  //     am5map.MapChart.new(root, {projection: am5map.geoNaturalEarth1()})
  //   )
  //
  //   const series = generateSeries(root, chart)
  //   setSeries(series)
  //   series.mapPolygons.template.events.on("click", ev => {
  //     series.zoomToDataItem(ev.target.dataItem)
  //   })
  //   createZoomControl(root, chart)
  //   createHomeButton(root, chart)
  //   return () => root.dispose()
  // }, [])

  const createHomeButton = (root, chart) => {
    const homeButton = chart.children.push(am5.Button.new(root, {
      ...defaultButtonProps,
      scale: .75,
      icon: am5.Graphics.new(root, {
        svgPath: "M16,8 L14,8 L14,16 L10,16 L10,10 L6,10 L6,16 L2,16 L2,8 L0,8 L8,0 L16,8 Z M16,8",
        fill: am5.color(0xffffff)
      })
    }));
    homeButton.events.on("click", () => chart.goHome())
    homeButton.show()
  }

  const createZoomControl = (root, chart) => {
    const zoomControl = am5map.ZoomControl.new(root, {});
    chart.set("zoomControl", zoomControl)
    zoomControl.minusButton.set("scale", .75)
    zoomControl.plusButton.set("scale", .75)
  }

  const generateSeries = (root, chart) => {
    const series = chart.series.push(am5map.MapPolygonSeries.new(root, {geoJSON: mapGeodata,}))
    const template = series.mapPolygons.template
    template.setAll(
      {
        tooltipText: "{name}",
        interactive: true,
        templateField: "columnSettings",
        fill: am5.color("#474D84")
      })
    template.states.create("hover", {fill: am5.color("#354D84")})
    // let pointSeries = chart.series.push(
    //   am5map.MapPointSeries.new(root, {})
    // );
    //
    // let colorSet = am5.ColorSet.new(root, {step:2});
    // pointSeries.bullets.push(function(root, series, dataItem) {
    //   let value = dataItem.dataContext.value;
    //
    //   let container = am5.Container.new(root, {});
    //   let color = colorSet.next();
    //   let radius = 15 + value / 20 * 20;
    //   let circle = container.children.push(am5.Circle.new(root, {
    //     radius: radius,
    //     fill: color,
    //     dy: -radius * 2
    //   }))
    //
    //   let pole = container.children.push(am5.Line.new(root, {
    //     stroke: color,
    //     height: -40,
    //     strokeGradient: am5.LinearGradient.new(root, {
    //       stops:[
    //         { opacity: 1 },
    //         { opacity: 1 },
    //         { opacity: 0 }
    //       ]
    //     })
    //   }));
    //
    //   let label = container.children.push(am5.Label.new(root, {
    //     text: value + "%",
    //     fill: am5.color(0xffffff),
    //     fontWeight: "400",
    //     centerX: am5.p50,
    //     centerY: am5.p50,
    //     dy: -radius * 2
    //   }))
    //
    //   let titleLabel = container.children.push(am5.Label.new(root, {
    //     text: dataItem.dataContext.title,
    //     fill: color,
    //     fontWeight: "500",
    //     fontSize: "1em",
    //     centerY: am5.p50,
    //     dy: -radius * 2,
    //     dx: radius
    //   }))
    //
    //   return am5.Bullet.new(root, {
    //     sprite: container
    //   });
    // });
    //
    // let data = [{
    //   "title": "United States",
    //   "latitude": 39.563353,
    //   "longitude": -99.316406,
    //   "value":12
    // }, {
    //   "title": "European Union",
    //   "latitude": 50.896104,
    //   "longitude": 19.160156,
    //   "value":15
    // }, {
    //   "title": "Asia",
    //   "latitude": 47.212106,
    //   "longitude": 103.183594,
    //   "value":8
    // }, {
    //   "title": "Africa",
    //   "latitude": 11.081385,
    //   "longitude": 21.621094,
    //   "value":5
    // }];
    // for (var i = 0; i < data.length; i++) {
    //   let d = data[i];
    //   pointSeries.data.push({
    //     geometry: { type: "Point", coordinates: [d.longitude, d.latitude] },
    //     title: d.title,
    //     value: d.value
    //   });
    // }
    return series
  }

  return <div>
    <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">Earthquakes</h4>
              <div className="row">
                <div className="col-md-12">
                  {/*<div id="map" style={{ width: "100%", height: "350px" }}></div>*/}
                  <Bar data={data} options={options} />
                </div>
              </div>
              <div className="row">
                <div className="col-md-12">
                  <div className="table-responsive table-hover">
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
                        : <table className="table">
                      <thead>
                      <tr>
                        <th> Time </th>
                        <th> Location </th>
                        <th> Magnitude </th>
                        <th> Latitude </th>
                        <th> Longitude </th>
                        <th> Depth </th>
                      </tr>
                      </thead>
                      <tbody>
                      {
                        earthquakes.list?.map((e, i) => <tr key={i}>
                          <td>
                            {new Date(e.timestamp).toLocaleDateString() + " " + new Date(e.timestamp).toLocaleTimeString()}
                          </td>
                          <td>{e.location}</td>
                          <td> {e.magnitude} {e.intensity ? `(${e.intensity})` : null}</td>
                          <td> {e.latitude} </td>
                          <td> {e.longitude} </td>
                          <td className="font-weight-medium"> {e.depth} km </td>
                        </tr>)
                      }
                      </tbody>
                    </table>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  </div>
}

export default Earthquakes;
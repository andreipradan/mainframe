import React, {useEffect, useState} from 'react';
import Slider from "react-slick";
import { Doughnut } from 'react-chartjs-2';
import { TodoListComponent } from '../apps/TodoList'
import { useDispatch, useSelector } from "react-redux";
import { VectorMap } from "react-jvectormap"
import {BallTriangle, InfinitySpin, LineWave} from "react-loader-spinner";
import Nouislider from 'nouislider-react';
import "nouislider/distribute/nouislider.css";
import { SliderPicker } from 'react-color';

import BotsApi from "../../api/bots";
import LightsApi from "../../api/lights";
import {Collapse, Form} from "react-bootstrap";
import Alert from "react-bootstrap/Alert";

const mapData = {
  "BZ": 75.00,
  "US": 56.25,
  "AU": 15.45,
  "GB": 25.00,
  "RO": 10.25,
  "GE": 33.25
}

const Dashboard = () => {
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token)

  const bots = useSelector(state => state.bots)

  const lights = useSelector(state => state.lights)

  const botsExternalCount = bots.list?.filter(b => b.is_external === true).length
  const botsLocalCount = bots.list?.filter(b => b.is_external === false).length
  const botsNoWebhookCount = bots.list?.filter(b => !b.webhook).length
  const botsTotalCount = bots.list?.length

  const lightsOnCount = lights.list?.filter(b => b.capabilities.power === "on").length
  const lightsOffCount = lights.list?.filter(b => b.capabilities.power === "off").length
  const lightsTotalCount = lights.list?.length

  const [lightsExpanded, setLightsExpanded] = useState(null)
  const [lightColors, setLightColors] = useState(null)
  const getExpanded = ip => lightsExpanded?.find(l => l.ip === ip)?.expanded
  const toggleLightExpanded = ip => setLightsExpanded(
    lightsExpanded?.map(l => l.ip === ip ? {...l, expanded: !l.expanded} : l)
  )

  const [botsAlertOpen, setBotsAlertOpen] = useState(false)
  const [lightsAlertOpen, setLightsAlertOpen] = useState(false)

  useEffect(() => {setLightsAlertOpen(!!lights.errors)}, [lights.errors])
  useEffect(() => {setBotsAlertOpen(!!bots.errors)}, [bots.errors])

  useEffect(() => {
    !bots.list && dispatch(BotsApi.getList(token));
    !lights.list && dispatch(LightsApi.getList(token));
  }, []);

  useEffect( () => {
    if (lights.list) {
      if (!lightsExpanded)
        setLightsExpanded(lights.list?.map(l => ({ip: l.ip, expanded: false})))
      setLightColors(lights.list?.map(l => ({ip: l.ip, color: "#0059ff"})))
    }
  }, [lights.list])

  const onSlide = (i, isDisplayed) => () => {
    const tooltip = document.querySelector(`#slider-${i} .noUi-tooltip`)
    if (tooltip)
      tooltip.style.display = isDisplayed ? "block": "none"
  }

  const botsData =  {
    labels: ["Local", "External"],
    datasets: [{data: [botsLocalCount, botsExternalCount], backgroundColor: ["#27d200","#0099ff"]}]
  };

  const lightsData =  {
    labels: ["Off", "On"],
    datasets: [{data: [lightsOffCount, lightsOnCount], backgroundColor: ["#ff0000", "#00d25b"],}]
  };

  const botsChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    segmentShowStroke: false,
    cutoutPercentage: 70,
    elements: {arc: {borderWidth: 0}},
    legend: {display: false},
    tooltips: {enabled: true}
  }

  const sliderSettings = {infinite: true, speed: 500, slidesToShow: 1, slidesToScroll: 1}
  return (
    <div>
      <div className="row">
        <div className="col-md-3 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">Lights</h4>
              {
                lights.loading
                  ? <InfinitySpin
                    visible={true}
                    width="100%"
                    ariaLabel="InfinitySpin-loading"
                    wrapperStyle={{}}
                    wrapperClass="InfinitySpin-wrapper"
                    glassColor = '#c0efff'
                    color = '#e15b64'
                  />
                  : <>
                    <div className="aligner-wrapper">
                      <Doughnut data={lightsData} options={botsChartOptions} />
                      <div className="absolute center-content">
                        <h5 className="font-weight-normal text-white text-center mb-2 text-white">{lightsTotalCount}</h5>
                        <p className="text-small text-muted text-center mb-0">Total</p>
                      </div>
                    </div>
                    <div className="bg-gray-dark d-flex d-md-block d-xl-flex flex-row py-3 px-4 px-md-3 px-xl-4 rounded mt-3">
                      <div className="text-md-center text-xl-left">
                        <h6 className="mb-1">Total</h6>
                      </div>
                      <div className="align-self-center flex-grow text-right text-md-center text-xl-right py-md-2 py-xl-0">
                        <h6 className="font-weight-bold mb-0">{lightsTotalCount}</h6>
                      </div>
                    </div>
                    <div className="bg-gray-dark d-flex d-md-block d-xl-flex flex-row py-3 px-4 px-md-3 px-xl-4 rounded mt-3">
                      <div className="text-md-center text-xl-left">
                        <h6 className="mb-1">Lights On</h6>
                      </div>
                      <div className="align-self-center flex-grow text-right text-md-center text-xl-right py-md-2 py-xl-0">
                        <h6 className="font-weight-bold mb-0">{lightsOnCount}</h6>
                      </div>
                    </div>
                    <div className="bg-gray-dark d-flex d-md-block d-xl-flex flex-row py-3 px-4 px-md-3 px-xl-4 rounded mt-3">
                      <div className="text-md-center text-xl-left">
                        <h6 className="mb-1">Lights Off</h6>
                      </div>
                      <div className="align-self-center flex-grow text-right text-md-center text-xl-right py-md-2 py-xl-0">
                        <h6 className="font-weight-bold mb-0">{lightsOffCount}</h6>
                      </div>
                    </div>
                  </>
              }
            </div>
          </div>
        </div>
        <div className="col-md-6 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <div className="d-flex flex-row justify-content-between">
                <h4 className="card-title mb-1">
                  Lights
                  <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(LightsApi.getList(token))}>
                    <i className="mdi mdi-refresh" />
                  </button>
                </h4>
                <p className="text-muted mb-1">Status</p>
              </div>
              <div className="row">
                <div className="col-12">
                  {lightsAlertOpen && <Alert variant="danger" dismissible onClose={() => setLightsAlertOpen(false)}>{lights.errors}</Alert>}
                  <div className="preview-list">
                    {
                      lights.loading
                        ? <InfinitySpin
                          visible={true}
                          width="100%"
                          ariaLabel="InfinitySpin-loading"
                          wrapperStyle={{}}
                          wrapperClass="InfinitySpin-wrapper"
                          glassColor = '#c0efff'
                          color = '#e15b64'
                        />
                        : lights.list
                          ? lights.list.map((light, i) =>
                            <div key={i}>
                              <div className="preview-item border-bottom">
                                <div className="preview-thumbnail">
                                  <p className={`text-${light.capabilities.power === "off" ? "danger" : "success"}`}>
                                    <i className={`mdi mdi-lightbulb${light.capabilities.power === "off" ? "-outline" : ""}`} />
                                  </p>
                                </div>
                                <div className="preview-item-content d-sm-flex flex-grow" onClick={() => toggleLightExpanded(light.ip)} style={{cursor: "pointer"}}>
                                  <div className="flex-grow">
                                    <h6 className="preview-subject">{light.capabilities.name} <i className="mdi mdi-menu-down"></i></h6>
                                    <p className="text-muted mb-0">{light.ip}</p>
                                  </div>
                                  <div className="mr-auto text-sm-right pt-2 pt-sm-0">
                                    <Form.Check
                                      checked={light.capabilities.power === "on"}
                                      type="switch"
                                      id={`checkbox-${i}`}
                                      label=""
                                      onChange={() => {
                                        const action = light.capabilities.power === "on" ? LightsApi.turn_off : LightsApi.turn_on
                                        dispatch(action(token, light.ip))
                                      }}
                                  />
                                    <p className="text-muted mb-0">Brightness: {light.capabilities.bright}%</p>
                                  </div>
                                </div>
                              </div>
                              <Collapse in={ getExpanded(light.ip) }>
                                <div className="slider" id={`slider-${i}`}>
                                  {lights.loadingLights?.includes(light.ip)
                                    ? <LineWave
                                      visible={true}
                                      width="100%"
                                      ariaLabel="line-wave-loading"
                                      wrapperStyle={{}}
                                      wrapperClass="LineWave-wrapper"
                                      glassColor='#c0efff'
                                      color='#e15b64'
                                      key={i}
                                    />
                                    : <>
                                    <Nouislider
                                      className="brightness-slider"
                                      id={light.ip}
                                      connect="lower"
                                      step={1}
                                      start={light.capabilities.bright}
                                      range={{min: 0, max: 100}}
                                      onSet={onSlide(i)}
                                      onChange={(render, handle, value, un, percent) => {
                                        dispatch(LightsApi.setBrightness(token, light.ip, percent[0]));
                                      }}
                                      onSlide={onSlide(i, true)}
                                      tooltips={true}
                                    />
                                      <SliderPicker
                                        className="mt-4"
                                        color={ lightColors?.find(c => c.ip === light.ip).color }
                                        onChange={color =>
                                          setLightColors(lightColors.map(c => c.ip !== light.ip ? c : {ip: c.ip, color: color.hex}))
                                        }
                                        onChangeComplete={color => {
                                          dispatch(LightsApi.setRgb(token, light.ip, [color.rgb.r || 1, color.rgb.g || 1, color.rgb.b || 1]))
                                        } }
                                      />
                                      <Nouislider
                                        className="temp-slider mt-4"
                                        id={`temp-slider-${i}`}
                                        connect="lower"
                                        step={1}
                                        start={light.capabilities.ct}
                                        range={{min: 1700, max: 6500}}
                                        onChange={(render, handle, value, un, percent) => {
                                          dispatch(LightsApi.setColorTemp(token, light.ip, value[0]));
                                        }}
                                        tooltips={true}
                                      />
                                    </>
                                    }
                                  </div>
                              </Collapse>
                            </div>)
                          : <div className="preview-item">
                            <div className="preview-thumbnail"></div>
                            <div className="preview-item-content d-sm-flex flex-grow">
                              <div className="flex-grow">
                                <h6 className="preview-subject">No lights available</h6>
                              </div>
                            </div>
                          </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                Bots
                <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(BotsApi.getList(token))}>
                  <i className="mdi mdi-refresh" />
                </button>
              </h4>
              {botsAlertOpen && <Alert variant="danger" dismissible onClose={() => setBotsAlertOpen(false)}>{bots.errors}</Alert>}

              {
                bots.loading
                  ? <BallTriangle
                    visible={true}
                    width="100%"
                    ariaLabel="ball-triangle-loading"
                    wrapperStyle={{}}
                    wrapperClass={{}}
                    color = '#e15b64'
                  />
                  : <>
                    <div className="aligner-wrapper">
                      <Doughnut data={botsData} options={botsChartOptions} />
                      <div className="absolute center-content">
                        <h5 className="font-weight-normal text-white text-center mb-2 text-white">{botsTotalCount}</h5>
                        <p className="text-small text-muted text-center mb-0">Total</p>
                      </div>
                    </div>
                    <div className="bg-gray-dark d-flex d-md-block d-xl-flex flex-row py-3 px-4 px-md-3 px-xl-4 rounded mt-3">
                      <div className="text-md-center text-xl-left">
                        <h6 className="mb-1">Total</h6>
                        {/*<p className="text-muted mb-0">07 Jan 2019, 09:12AM</p>*/}
                      </div>
                      <div className="align-self-center flex-grow text-right text-md-center text-xl-right py-md-2 py-xl-0">
                        <h6 className="font-weight-bold mb-0">{botsTotalCount}</h6>
                      </div>
                    </div>
                    <div className="bg-gray-dark d-flex d-md-block d-xl-flex flex-row py-3 px-4 px-md-3 px-xl-4 rounded mt-3">
                      <div className="text-md-center text-xl-left">
                        <h6 className="mb-1">Local Bots</h6>
                      </div>
                      <div className="align-self-center flex-grow text-right text-md-center text-xl-right py-md-2 py-xl-0">
                        <h6 className="font-weight-bold mb-0">{botsLocalCount}</h6>
                      </div>
                    </div>
                    <div className="bg-gray-dark d-flex d-md-block d-xl-flex flex-row py-3 px-4 px-md-3 px-xl-4 rounded mt-3">
                      <div className="text-md-center text-xl-left">
                        <h6 className="mb-1">External Bots</h6>
                      </div>
                      <div className="align-self-center flex-grow text-right text-md-center text-xl-right py-md-2 py-xl-0">
                        <h6 className="font-weight-bold mb-0">{botsExternalCount}</h6>
                      </div>
                    </div>
                    <div className="bg-gray-dark d-flex d-md-block d-xl-flex flex-row py-3 px-4 px-md-3 px-xl-4 rounded mt-3">
                      <div className="text-md-center text-xl-left">
                        <h6 className="mb-1">No Webhook</h6>
                      </div>
                      <div className="align-self-center flex-grow text-right text-md-center text-xl-right py-md-2 py-xl-0">
                        <h6 className="font-weight-bold mb-0">{botsNoWebhookCount}</h6>
                      </div>
                    </div>
                  </>
              }
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-sm-4 grid-margin">
          <div className="card">
            <div className="card-body">
              <h5>Revenue</h5>
              <div className="row">
                <div className="col-8 col-sm-12 col-xl-8 my-auto">
                  <div className="d-flex d-sm-block d-md-flex align-items-center">
                    <h2 className="mb-0">$32123</h2>
                    <p className="text-success ml-2 mb-0 font-weight-medium">+3.5%</p>
                  </div>
                  <h6 className="text-muted font-weight-normal">11.38% Since last month</h6>
                </div>
                <div className="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                  <i className="icon-lg mdi mdi-codepen text-primary ml-auto"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-4 grid-margin">
          <div className="card">
            <div className="card-body">
              <h5>Sales</h5>
              <div className="row">
                <div className="col-8 col-sm-12 col-xl-8 my-auto">
                  <div className="d-flex d-sm-block d-md-flex align-items-center">
                    <h2 className="mb-0">$45850</h2>
                    <p className="text-success ml-2 mb-0 font-weight-medium">+8.3%</p>
                  </div>
                  <h6 className="text-muted font-weight-normal"> 9.61% Since last month</h6>
                </div>
                <div className="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                  <i className="icon-lg mdi mdi-wallet-travel text-danger ml-auto"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-sm-4 grid-margin">
          <div className="card">
            <div className="card-body">
              <h5>Purchase</h5>
              <div className="row">
                <div className="col-8 col-sm-12 col-xl-8 my-auto">
                  <div className="d-flex d-sm-block d-md-flex align-items-center">
                    <h2 className="mb-0">$2039</h2>
                    <p className="text-danger ml-2 mb-0 font-weight-medium">-2.1% </p>
                  </div>
                  <h6 className="text-muted font-weight-normal">2.27% Since last month</h6>
                </div>
                <div className="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                  <i className="icon-lg mdi mdi-monitor text-success ml-auto"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row ">
        <div className="col-12 grid-margin">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">Order Status</h4>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>
                        <div className="form-check form-check-muted m-0">
                          <label className="form-check-label">
                            <input type="checkbox" className="form-check-input" />
                            <i className="input-helper"></i>
                          </label>
                        </div>
                      </th>
                      <th> Client Name </th>
                      <th> Order No </th>
                      <th> Product Cost </th>
                      <th> Project </th>
                      <th> Payment Mode </th>
                      <th> Start Date </th>
                      <th> Payment Status </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className="form-check form-check-muted m-0">
                          <label className="form-check-label">
                            <input type="checkbox" className="form-check-input" />
                            <i className="input-helper"></i>
                          </label>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex">
                          <img src={require('../../assets/images/faces/face1.jpg')} alt="face" />
                          <span className="pl-2">Henry Klein</span>
                        </div>
                      </td>
                      <td> 02312 </td>
                      <td> $14,500 </td>
                      <td> Dashboard </td>
                      <td> Credit card </td>
                      <td> 04 Dec 2019 </td>
                      <td>
                        <div className="badge badge-outline-success">Approved</div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="form-check form-check-muted m-0">
                          <label className="form-check-label">
                            <input type="checkbox" className="form-check-input" />
                            <i className="input-helper"></i>
                          </label>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex">
                          <img src={require('../../assets/images/faces/face2.jpg')} alt="face" />
                          <span className="pl-2">Estella Bryan</span>
                        </div>
                      </td>
                      <td> 02312 </td>
                      <td> $14,500 </td>
                      <td> Website </td>
                      <td> Cash on delivered </td>
                      <td> 04 Dec 2019 </td>
                      <td>
                        <div className="badge badge-outline-warning">Pending</div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="form-check form-check-muted m-0">
                          <label className="form-check-label">
                            <input type="checkbox" className="form-check-input" />
                            <i className="input-helper"></i>
                          </label>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex">
                          <img src={require('../../assets/images/faces/face5.jpg')} alt="face" />
                          <span className="pl-2">Lucy Abbott</span>
                        </div>
                      </td>
                      <td> 02312 </td>
                      <td> $14,500 </td>
                      <td> App design </td>
                      <td> Credit card </td>
                      <td> 04 Dec 2019 </td>
                      <td>
                        <div className="badge badge-outline-danger">Rejected</div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="form-check form-check-muted m-0">
                          <label className="form-check-label">
                            <input type="checkbox" className="form-check-input" />
                            <i className="input-helper"></i>
                          </label>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex">
                          <img src={require('../../assets/images/faces/face3.jpg')} alt="face" />
                          <span className="pl-2">Peter Gill</span>
                        </div>
                      </td>
                      <td> 02312 </td>
                      <td> $14,500 </td>
                      <td> Development </td>
                      <td> Online Payment </td>
                      <td> 04 Dec 2019 </td>
                      <td>
                        <div className="badge badge-outline-success">Approved</div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <div className="form-check form-check-muted m-0">
                          <label className="form-check-label">
                            <input type="checkbox" className="form-check-input" />
                            <i className="input-helper"></i>
                          </label>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex">
                          <img src={require('../../assets/images/faces/face4.jpg')} alt="face" />
                          <span className="pl-2">Sallie Reyes</span>
                        </div>
                      </td>
                      <td> 02312 </td>
                      <td> $14,500 </td>
                      <td> Website </td>
                      <td> Credit card </td>
                      <td> 04 Dec 2019 </td>
                      <td>
                        <div className="badge badge-outline-success">Approved</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6 col-xl-4 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <div className="d-flex flex-row justify-content-between">
                <h4 className="card-title">Messages</h4>
                <p className="text-muted mb-1 small">View all</p>
              </div>
              <div className="preview-list">
                <div className="preview-item border-bottom">
                  <div className="preview-thumbnail">
                    <img src={require('../../assets/images/faces/face6.jpg')} alt="face" className="rounded-circle" />
                  </div>
                  <div className="preview-item-content d-flex flex-grow">
                    <div className="flex-grow">
                      <div className="d-flex d-md-block d-xl-flex justify-content-between">
                        <h6 className="preview-subject">Leonard</h6>
                        <p className="text-muted text-small">5 minutes ago</p>
                      </div>
                      <p className="text-muted">Well, it seems to be working now.</p>
                    </div>
                  </div>
                </div>
                <div className="preview-item border-bottom">
                  <div className="preview-thumbnail">
                    <img src={require('../../assets/images/faces/face8.jpg')} alt="face" className="rounded-circle" />
                  </div>
                  <div className="preview-item-content d-flex flex-grow">
                    <div className="flex-grow">
                      <div className="d-flex d-md-block d-xl-flex justify-content-between">
                        <h6 className="preview-subject">Luella Mills</h6>
                        <p className="text-muted text-small">10 Minutes Ago</p>
                      </div>
                      <p className="text-muted">Well, it seems to be working now.</p>
                    </div>
                  </div>
                </div>
                <div className="preview-item border-bottom">
                  <div className="preview-thumbnail">
                    <img src={require('../../assets/images/faces/face9.jpg')} alt="face" className="rounded-circle" />
                  </div>
                  <div className="preview-item-content d-flex flex-grow">
                    <div className="flex-grow">
                      <div className="d-flex d-md-block d-xl-flex justify-content-between">
                        <h6 className="preview-subject">Ethel Kelly</h6>
                        <p className="text-muted text-small">2 Hours Ago</p>
                      </div>
                      <p className="text-muted">Please review the tickets</p>
                    </div>
                  </div>
                </div>
                <div className="preview-item border-bottom">
                  <div className="preview-thumbnail">
                    <img src={require('../../assets/images/faces/face11.jpg')} alt="face" className="rounded-circle" />
                  </div>
                  <div className="preview-item-content d-flex flex-grow">
                    <div className="flex-grow">
                      <div className="d-flex d-md-block d-xl-flex justify-content-between">
                        <h6 className="preview-subject">Herman May</h6>
                        <p className="text-muted text-small">4 Hours Ago</p>
                      </div>
                      <p className="text-muted">Thanks a lot. It was easy to fix it .</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xl-4 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">Portfolio Slide</h4>
              <Slider className="portfolio-slider" {...sliderSettings}>
                <div className="item">
                  <img src={require('../../assets/images/dashboard/Rectangle.jpg')} alt="carousel-item" />
                </div>
                <div className="item">
                  <img src={require('../../assets/images/dashboard/Img_5.jpg')} alt="carousel-item" />
                </div>
                <div className="item">
                  <img src={require('../../assets/images/dashboard/img_6.jpg')} alt="carousel-item" />
                </div>
              </Slider>
              <div className="d-flex py-4">
                <div className="preview-list w-100">
                  <div className="preview-item p-0">
                    <div className="preview-thumbnail">
                      <img src={require('../../assets/images/faces/face12.jpg')} className="rounded-circle" alt="face" />
                    </div>
                    <div className="preview-item-content d-flex flex-grow">
                      <div className="flex-grow">
                        <div className="d-flex d-md-block d-xl-flex justify-content-between">
                          <h6 className="preview-subject">CeeCee Bass</h6>
                          <p className="text-muted text-small">4 Hours Ago</p>
                        </div>
                        <p className="text-muted">Well, it seems to be working now.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-muted">Well, it seems to be working now. </p>
              <div className="progress progress-md portfolio-progress">
                <div className="progress-bar bg-success" role="progressbar" style={{width: '50%'}} aria-valuenow="25" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-12 col-xl-4 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">To do list</h4>
              <TodoListComponent />
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">Visitors by Countries</h4>
              <div className="row">
                <div className="col-md-5">
                  <div className="table-responsive">
                    <table className="table">
                      <tbody>
                        <tr>
                          <td>
                            <i className="flag-icon flag-icon-us"></i>
                          </td>
                          <td>USA</td>
                          <td className="text-right"> 1500 </td>
                          <td className="text-right font-weight-medium"> 56.35% </td>
                        </tr>
                        <tr>
                          <td>
                            <i className="flag-icon flag-icon-de"></i>
                          </td>
                          <td>Germany</td>
                          <td className="text-right"> 800 </td>
                          <td className="text-right font-weight-medium"> 33.25% </td>
                        </tr>
                        <tr>
                          <td>
                            <i className="flag-icon flag-icon-au"></i>
                          </td>
                          <td>Australia</td>
                          <td className="text-right"> 760 </td>
                          <td className="text-right font-weight-medium"> 15.45% </td>
                        </tr>
                        <tr>
                          <td>
                            <i className="flag-icon flag-icon-gb"></i>
                          </td>
                          <td>United Kingdom</td>
                          <td className="text-right"> 450 </td>
                          <td className="text-right font-weight-medium"> 25.00% </td>
                        </tr>
                        <tr>
                          <td>
                            <i className="flag-icon flag-icon-ro"></i>
                          </td>
                          <td>Romania</td>
                          <td className="text-right"> 620 </td>
                          <td className="text-right font-weight-medium"> 10.25% </td>
                        </tr>
                        <tr>
                          <td>
                            <i className="flag-icon flag-icon-br"></i>
                          </td>
                          <td>Brasil</td>
                          <td className="text-right"> 230 </td>
                          <td className="text-right font-weight-medium"> 75.00% </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="col-md-7">
                  <div id="audience-map" className="vector-map"></div>
                  <VectorMap
                    map={"world_mill"}
                    backgroundColor="transparent" //change it to ocean blue: #0077be
                    panOnDrag={true}
                    containerClassName="dashboard-vector-map"
                    focusOn= { {
                      x: 0.5,
                      y: 0.5,
                      scale: 1,
                      animate: true
                    }}
                    series={{
                      regions: [{
                        scale: ['#3d3c3c', '#f2f2f2'],
                        normalizeFunction: 'polynomial',
                        values: mapData
                      }]
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
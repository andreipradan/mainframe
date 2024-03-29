import React, { useEffect } from 'react'
import { useDispatch, useSelector } from "react-redux";
import DevicesApi from "../../api/devices";
import {Audio, ColorRing} from "react-loader-spinner";
import {select} from "../../redux/devicesSlice";
import EditModal from "../devices/components/EditModal";
import Errors from "../shared/Errors";


const Devices = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {results: devices, errors, loading, loadingDevices } = useSelector(state => state.devices)

  useEffect(() => {
    !devices && dispatch(DevicesApi.getList(token));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Network Devices</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Devices</li>
          </ol>
        </nav>
      </div>
      <div className="row">
        <div className="col-lg-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                Available devices
                <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(DevicesApi.getList(token))}>
                  <i className="mdi mdi-refresh"></i>
                </button>
                <button type="button" className="btn btn-outline-primary btn-sm p-0 border-0 bg-transparent" onClick={() => dispatch(DevicesApi.sync(token))}>
                  <i className="mdi mdi-sync-alert"></i>
                </button>
              </h4>
              <Errors errors={errors}/>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th> # </th>
                      <th> Name </th>
                      <th> Is Active? </th>
                      <th> IP</th>
                      <th> Mac Address </th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      !loading
                        ? devices?.length
                          ? devices.map(
                            (device, i) => !loadingDevices?.includes(device.id)
                              ? <tr key={i}>
                                <td>{i + 1}</td>
                                <td>{device.name || "-"} &nbsp;</td>
                                <td className="center-content"><i className={`mdi mdi-${device.is_active ? "check text-success" : "alert text-danger"}`} /></td>
                                <td>{device.ip }</td>
                                <td>{device.mac}</td>
                                <td>
                                  <div className="btn-group" role="group" aria-label="Basic example">
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={() => dispatch(select(device.id))}
                                    >
                                      <i className="mdi mdi-pencil"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                          : <tr key={i}>
                            <td colSpan={6}>
                              <ColorRing
                                  width = "100%"
                                  height = "50"
                                  wrapperStyle={{width: "100%"}}
                                />
                            </td>
                          </tr>
                            )
                          : <tr><td colSpan={6}>No devices available</td></tr>
                        : <tr>
                          <td colSpan={6}>
                            <Audio
                                width = "100%"
                                radius = "9"
                                color = 'green'
                                wrapperStyle={{width: "100%"}}
                              />
                            </td>
                          </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EditModal />
    </div>
  )
}

export default Devices;

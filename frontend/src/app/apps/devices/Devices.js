import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Audio, ColorRing } from "react-loader-spinner";
import { Collapse } from 'react-bootstrap';

import DevicesApi from "../../../api/devices";
import EditModal from "./components/EditModal";
import Errors from "../../shared/Errors";
import { selectItem, setModalOpen } from '../../../redux/devicesSlice';


const Devices = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {results, errors, loading, loadingDevices, count } = useSelector(state => state.devices)

  const [devices, setDevices] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sorting, setSorting] = useState(null)

  const search = () => {
    return results.filter(d =>
      ["ip", "mac", "name"].some(key =>
        d[key].toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  const getSortingComponent = column => {
    const sortingClass = `cursor-pointer mdi mdi-sort-alphabetical${
        sorting?.includes(`${column}-asc`)
          ? '-ascending'
          : sorting?.includes(`${column}-desc`)
            ? '-descending'
            : ''
      }`
    return <>
      <i
        className={sortingClass}
        onClick={() => {
          const hasSorting = sorting?.find(s => s.startsWith(`${column}-`))
          setSorting(
            !hasSorting
              ? !sorting ? [`${column}-asc`] : [...sorting, `${column}-asc`]
              : hasSorting === `${column}-asc`
                ? sorting.map(s => s === `${column}-asc` ? `${column}-desc` : s)
                : hasSorting === `${column}-desc`
                  ? sorting.filter(s => s !== `${column}-desc`)
                  : sorting
          )
        }
      }
      ></i>
      {
        sorting?.find(s => s.startsWith(`${column}-`)) &&
        <sup>{sorting.findIndex(s => s.startsWith(`${column}-`)) + 1}</sup>
      }
    </>
  }

  useEffect(() => {!devices && dispatch(DevicesApi.getList(token))}, []);
  useEffect(() => {if (results) setDevices(results)}, [results])

  useEffect(() => {
    if (!devices) return
    if (!sorting?.length) return setDevices(results)
    const devicesCopy = devices.slice()
    setDevices(devicesCopy.sort((a, b) => {
      for (let i = 0; i < sorting.length; i++) {
        let [key, order] = sorting[i].split("-")
        let direction = order === "asc" ? 1 : -1
        if (a[key] > b[key]) return direction
        if (a[key] < b[key]) return -direction
      }
      return 0
    }))
  }, [sorting])

  useEffect(() => {results && setDevices(search())}, [searchTerm]);

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
                <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent"
                        onClick={() => dispatch(DevicesApi.getList(token))}>
                  <i className="mdi mdi-refresh"></i>
                </button>
                <button type="button" className="btn btn-outline-primary btn-sm p-0 border-0 bg-transparent"
                        onClick={() => dispatch(DevicesApi.sync(token))}>
                  <i className="mdi mdi-sync-alert"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm border-0 bg-transparent"
                  onClick={() => setSearchOpen(!searchOpen)}
                >
                  <i className="mdi mdi-magnify" />
                </button>
                <button
                  type="button"
                  className="float-right btn btn-outline-primary btn-rounded btn-icon pl-1"
                  onClick={() => dispatch(setModalOpen(true))}
                >
                  <i className="mdi mdi-plus"></i>
                </button>
                <p className="text-small text-muted">Total: {count}</p>

              </h4>
              <Errors errors={errors} />
              <Collapse in={searchOpen}>
              <ul className="navbar-nav w-100 rounded">
                  <li className="nav-item w-100">
                    <form
                      className="nav-link mt-2 mt-md-0 d-lg-flex search"
                      onSubmit={e => {e.preventDefault()}}
                    >
                      <input
                        value={searchTerm}
                        type="search"
                        className="form-control"
                        placeholder="Search devices"
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </form>
                  </li>
                </ul>
              </Collapse>
              <div className="table-responsive table-hover">
                <table className="table">
                  <thead>
                  <tr>
                    <th>#</th>
                    <th>Name {getSortingComponent("displayName")}</th>
                    <th>Is Active? {getSortingComponent("is_active")}</th>
                    <th>IP {getSortingComponent("ip")}</th>
                    <th>Mac Address {getSortingComponent("mac")}</th>
                    <th>Last updated {getSortingComponent("updated_at")}</th>
                  </tr>
                  </thead>
                  <tbody>
                  {
                    !loading
                      ? devices?.length
                        ? devices.map(
                          (device, i) => !loadingDevices?.includes(device.id)
                            ? <tr
                              key={i}
                              onClick={() => dispatch(selectItem(device.id))}
                              className={"cursor-pointer"}
                            >
                            <td>{i + 1}</td>
                                <td>{device.alias || device.name || "-"} &nbsp;</td>
                                <td className="center-content"><i className={`mdi mdi-${device.is_active ? "check text-success" : "alert text-danger"}`} /></td>
                                <td>{device.ip }</td>
                                <td className={devices.filter(d => d.id !== device.id).map(d => d.mac.toLowerCase()).includes(device.mac.toLowerCase()) ? "text-danger" : "text-primary"}>{device.mac}</td>
                                <td>{new Date(device.updated_at).toLocaleString()}</td>
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
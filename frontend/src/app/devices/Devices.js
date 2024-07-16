import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import DevicesApi from "../../api/devices";
import {Audio, ColorRing} from "react-loader-spinner";
import { selectItem, setModalOpen } from '../../redux/devicesSlice';
import EditModal from "../devices/components/EditModal";
import Errors from "../shared/Errors";
import { Collapse } from 'react-bootstrap';


const Devices = () =>  {

  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {results, errors, loading, loadingDevices } = useSelector(state => state.devices)

  const [devices, setDevices] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sorting, setSorting] = useState("")

  const search = () => {
    return results.filter(d =>
      ["ip", "mac", "name"].some(key =>
        d[key].toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  useEffect(() => {
    !devices && dispatch(DevicesApi.getList(token))
  }, []);

  useEffect(() => setDevices(results), [results])

  useEffect(() => {
    if (!devices) return
    const devicesCopy = devices.slice()
    setDevices(devicesCopy.sort((a, b) =>
      !sorting
        ? a.is_active === b.is_active
          ? a.name > b.name ? 1 : -1
          : b.is_active > a.is_active ? 1 : -1
        : sorting === "mac-asc"
          ? a.mac > b.mac ? 1 : -1
          : sorting === "mac-desc"
            ? b.mac > a.mac ? 1 : -1
            : sorting === "ip-asc"
              ? a.ip > b.ip ? 1 : -1
              : sorting === "ip-desc"
                ? b.ip > a.ip ? 1 : -1
                : sorting === "name-asc"
                  ? a.name > b.name ? 1 : -1
                  : sorting === "name-desc"
                    ? b.name > a.name ? 1 : -1
                    : 1

    ))
  }, [sorting])

  useEffect(() => {
    results && setDevices(search())
  }, [searchTerm]);

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
                        placeholder="Search transactions"
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
                    <th> #</th>
                    <th> Name
                      <i
                        className={
                          `mdi mdi-sort-alphabetical${
                            sorting === 'name-asc'
                              ? '-ascending'
                              : sorting === 'name-desc'
                                ? '-descending' : ''
                          } cursor-pointer`
                        }
                        onClick={() => setSorting(!sorting.startsWith('name-') ? 'name-asc' : sorting === 'name-asc' ? 'name-desc' : '')}
                      ></i>
                    </th>
                    <th> Is Active?</th>
                    <th> IP
                      <i
                        className={
                          `mdi mdi-sort-alphabetical${
                            sorting === 'ip-asc'
                              ? '-ascending'
                              : sorting === 'ip-desc'
                                ? '-descending' : ''
                          } cursor-pointer`
                        }
                        onClick={() => setSorting(!sorting.startsWith("ip-") ? 'ip-asc' : sorting === 'ip-asc' ? 'ip-desc' : '')}
                      ></i>
                    </th>
                    <th> Mac Address
                      <i
                        className={
                          `mdi mdi-sort-alphabetical${
                            sorting === 'mac-asc'
                              ? '-ascending'
                              : sorting === 'mac-desc'
                                ? '-descending' : ''
                          } cursor-pointer`
                        }
                        onClick={() => setSorting(!sorting ? 'mac-asc' : sorting === "mac-asc" ? "mac-desc" : "")}
                      ></i>
                    </th>
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
                              >
                                <td>{i + 1}</td>
                                <td>{device.name || "-"} &nbsp;</td>
                                <td className="center-content"><i className={`mdi mdi-${device.is_active ? "check text-success" : "alert text-danger"}`} /></td>
                                <td>{device.ip }</td>
                                <td>{device.mac}</td>
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

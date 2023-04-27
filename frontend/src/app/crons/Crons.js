import React, {useEffect, useState} from 'react'
import { useDispatch, useSelector } from "react-redux";
import CronsApi from "../../api/crons";
import {Audio, ColorRing} from "react-loader-spinner";
import {select} from "../../redux/cronsSlice";
import Alert from "react-bootstrap/Alert";
import EditModal from "../crons/components/EditModal";


const Crons = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {results: crons, errors, loading, loadingCrons } = useSelector(state => state.crons)
  const [alertOpen, setAlertOpen] = useState(false)

  useEffect(() => {
    !crons && dispatch(CronsApi.getList(token));
  }, []);

  useEffect(() => {setAlertOpen(!!errors)}, [errors])

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Cron Jobs</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Crons</li>
          </ol>
        </nav>
      </div>
      <div className="row">
        <div className="col-lg-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                Available crons
                <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(CronsApi.getList(token))}>
                  <i className="mdi mdi-refresh"></i>
                </button>
              </h4>
              {alertOpen && <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>{errors}</Alert>}
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th> # </th>
                      <th> Command </th>
                      <th> Expression </th>
                      <th> Is Active? </th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      !loading
                        ? crons?.length
                          ? crons.map(
                            (cron, i) => !loadingCrons?.includes(cron.id)
                              ? <tr key={i}>
                                <td>{i + 1}</td>
                                <td>{cron.command}</td>
                                <td>{cron.expression}</td>
                                <td className="center-content"><i className={`mdi mdi-${cron.is_active ? "check text-success" : "alert text-danger"}`} /></td>
                                <td>
                                  <div className="btn-group" role="group" aria-label="Basic example">
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={() => dispatch(select(cron.id))}
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
                          : <tr><td colSpan={6}>No crons available</td></tr>
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

export default Crons;

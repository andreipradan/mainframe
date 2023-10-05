import React, {useEffect, useState} from 'react'
import { useDispatch, useSelector } from "react-redux";
import CronsApi from "../../api/crons";
import {Audio, ColorRing} from "react-loader-spinner";
import {select, setModalOpen} from "../../redux/cronsSlice";
import EditModal from "../crons/components/EditModal";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Errors from "../shared/Errors";


const Crons = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {results: crons, errors, loading, loadingCrons } = useSelector(state => state.crons)

  const [killModalOpen, setKillModalOpen] = useState(false)
  const [selectedKillCron, setSelectedKillCron] = useState(null)

  useEffect(() => {
    !crons && dispatch(CronsApi.getList(token));
  }, []);

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
                <button
                    type="button"
                    className="btn btn-outline-success btn-sm border-0 bg-transparent"
                    onClick={() => dispatch(CronsApi.getList(token))}
                >
                  <i className="mdi mdi-refresh"></i>
                </button>
                <button
                    type="button"
                    className="float-right btn btn-outline-primary btn-rounded btn-icon pl-1"
                    onClick={() => dispatch(setModalOpen(true))}
                >
                  <i className="mdi mdi-plus"></i>
                </button>
              </h4>
              <Errors errors={errors}/>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th> # </th>
                      <th> Command </th>
                      <th> Expression </th>
                      <th> Is Active? </th>
                      <th> Is Management? </th>
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
                                <td className="center-content"><i className={`mdi mdi-${cron.is_management ? "check text-success" : "alert text-danger"}`} /></td>
                                <td>
                                  <div className="btn-group" role="group" aria-label="Basic example">
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger"
                                        onClick={() => {
                                          setKillModalOpen(true)
                                          setSelectedKillCron(cron)
                                        }}
                                    >
                                      <i className="mdi mdi-skull-crossbones"></i>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary"
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
      <Modal centered show={killModalOpen} onHide={() => setKillModalOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="row">
              <div className="col-lg-12 grid-margin stretch-card">
                Are you sure you want to kill "{selectedKillCron?.command}"?
              </div>
            </div>
            <p className="text-muted mb-0">This may take a few moments, please be patient</p>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          This will kill any currently running processes for <b>{selectedKillCron?.command}</b><br/>
          but will not remove or update the actual cron job
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={e => {
            e.preventDefault()
            setKillModalOpen(false)
          }}>Close</Button>
          <Button variant="danger" className="float-left" onClick={evt => {
            evt.preventDefault()
            dispatch(CronsApi.kill(token, selectedKillCron?.id, selectedKillCron?.command))
            setKillModalOpen(false)
          }}>Yes, kill it!
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Crons;

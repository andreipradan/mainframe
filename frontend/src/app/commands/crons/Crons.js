import React, {useEffect, useState} from 'react'
import { useDispatch, useSelector } from "react-redux";
import {Audio, ColorRing} from "react-loader-spinner";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

import {select, setModalOpen} from "../../../redux/cronsSlice";
import CronsApi from "../../../api/crons";
import EditModal from "./components/EditModal";
import Errors from "../../shared/Errors";
import { capitalize } from '../../utils';
import { selectItem } from '../../../redux/watchersSlice';


const NOTSET = 0
const DEBUG = 10
const INFO = 20
const WARNING = 30
const ERROR = 40
const CRITICAL = 50

export const logLevels = {
  [NOTSET]: {label: "NOTSET", value: NOTSET},
  [DEBUG]: {label: "DEBUG", value: DEBUG},
  [INFO]: {label: "INFO", value: INFO},
  [WARNING]: {label: "WARNING", value: WARNING},
  [ERROR]: {label: "ERROR", value: ERROR},
  [CRITICAL]: {label: "CRITICAL", value: CRITICAL},
}

const Crons = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {selectedCron, results: crons, errors, loading, loadingCrons, modalOpen } = useSelector(state => state.crons)

  const api = new CronsApi(token)

  const [selectedAction, setSelectedAction] = useState("")
  const [selectedActionCron, setSelectedActionCron] = useState(null)

  useEffect(() => {!crons && dispatch(api.getList())}, []);

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
                    onClick={() => dispatch(api.getList())}
                >
                  <i className="mdi mdi-refresh" />
                </button>
                <button
                    type="button"
                    className="float-right btn btn-outline-primary btn-rounded btn-icon pl-1"
                    onClick={() => dispatch(setModalOpen(true))}
                >
                  <i className="mdi mdi-plus" />
                </button>
              </h4>

              {!selectedCron && !modalOpen && <Errors errors={errors}/>}

              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th> # </th>
                      <th> Name </th>
                      <th> Expression </th>
                      <th> Is Active? </th>
                      <th> Log level </th>
                      <th> Last run </th>
                      <th> Status </th>
                      <th> Run </th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      !loading
                        ? crons?.length
                          ? crons.map(
                            (cron, i) => !loadingCrons?.includes(cron.id)
                              ? <tr key={i}>
                                <td onClick={() => dispatch(select(cron.id))} className="cursor-pointer">{i + 1}</td>
                                <td onClick={() => dispatch(select(cron.id))} className="cursor-pointer">
                                  {cron.name}
                                </td>
                                <td onClick={() => dispatch(select(cron.id))} className="cursor-pointer">{cron.cron_description}</td>
                                <td onClick={() => dispatch(select(cron.id))} className="cursor-pointer">
                                  <i className={`mdi mdi-${cron.is_active ? 'check text-success' : 'alert text-danger'}`} />
                                </td>
                                <td
                                  className={
                                    `cursor-pointer text-${
                                      cron.log_level === DEBUG
                                        ? 'info'
                                        : cron.log_level === INFO
                                          ? 'primary'
                                          : cron.log_level === WARNING
                                            ? 'warning'
                                            : [CRITICAL, ERROR].includes(cron.log_level)
                                              ? 'danger'
                                              : 'secondary'
                                    }`
                                  }
                                  onClick={() => dispatch(select(cron.id))}
                                >
                                  {logLevels[cron.log_level].label}
                                </td>
                                <td onClick={() => dispatch(select(cron.id))} className="cursor-pointer">
                                  {
                                    cron.redis?.history?.[0]?.timestamp
                                      ? new Date(cron.redis.history[0].timestamp).toUTCString()
                                      : '-'
                                  }
                                </td>
                                <td
                                  className={
                                    `text-${
                                      cron.redis.history?.[0]?.status === 'complete'
                                        ? 'success'
                                        : cron.redis.history?.[0]?.status === 'executing'
                                          ? 'warning' : 'danger'
                                    }`
                                  }
                                  onClick={() => dispatch(selectItem(cron.id))}
                                >
                                  {cron.redis.history?.[0]?.status ? capitalize(cron.redis.history[0].status) : '-'}
                                </td>
                                <td>
                                  <div className="btn-group btn-group-sm" role="group">
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary border-0"
                                      onClick={() => {
                                        setSelectedAction('run');
                                        setSelectedActionCron(cron);
                                      }}
                                    >
                                      <i className="mdi mdi-play" />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger border-0"
                                      onClick={() => {
                                        setSelectedAction('kill');
                                        setSelectedActionCron(cron);
                                      }}
                                    >
                                      <i className="mdi mdi-skull-crossbones" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              : <tr key={i}>
                                <td colSpan={6}>
                                  <ColorRing
                                    width="100%"
                                    height="50"
                                    wrapperStyle={{ width: '100%' }}
                                  />
                                </td>
                              </tr>
                          )
                          : <tr>
                            <td colSpan={7}>No crons available</td>
                          </tr>
                        : <tr>
                          <td colSpan={7}>
                            <Audio width="100%" radius="9" color="green" wrapperStyle={{width: "100%"}} />
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
      <Modal centered show={Boolean(selectedAction)} onHide={() => setSelectedAction("")}>
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="row">
              <div className="col-lg-12 grid-margin stretch-card">
                Are you sure you want to {selectedAction} "{selectedActionCron?.command}"?
              </div>
            </div>
            <p className="text-muted mb-0">This may take a few moments, please be patient</p>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>This will run <b>{selectedActionCron?.command}</b></Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={e => {
            e.preventDefault()
            setSelectedAction("")
          }}>Close</Button>
          <Button variant={selectedAction === "run" ? "primary" : "danger"} className="float-left" onClick={evt => {
            evt.preventDefault()
            if (["kill", "run"].includes(selectedAction))
              dispatch(CronsApi[selectedAction](token, selectedActionCron?.id, selectedActionCron?.command))
            setSelectedAction("")
          }}>Yes, {selectedAction} it!
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Crons;

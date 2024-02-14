import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from "react-redux";
import { Collapse } from "react-bootstrap";
import { ColorRing } from "react-loader-spinner";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

import { capitalize } from "../finances/Accounts/AccountDetails/AccountDetails";
import { selectItem } from "../../redux/tasksSlice";
import Errors from "../shared/Errors";
import TasksApi from "../../api/tasks";

const parseStatus = status => {
  const icon = status === "complete"
  ? "✅"
  : status === "executing"
    ? "⚙️"
    : ["canceled", "error", "interrupted"].includes(status)
      ? "❌"
      : "❓"
  return `${capitalize(status)} ${icon}`
}

const Tasks = () =>  {
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.token)
  const {errors, loading, loadingItems, results, selectedItem } = useSelector(state => state.tasks)
  const [taskErrorsOpen, setTaskErrorsOpen] = useState(false)
  const [taskHistoryOpen, setTaskHistoryOpen] = useState(false)

  useEffect(() => {
    if (!results) dispatch(TasksApi.getList(token))
  }, [])

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Tasks</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Tasks</li>
          </ol>
        </nav>
      </div>
      <div className="row">
        <div className="col-lg-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                Current tasks
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm border-0 bg-transparent"
                  onClick={() => dispatch(TasksApi.getList(token))}
                >
                  <i className="mdi mdi-refresh"></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm border-0 bg-transparent"
                  onClick={() => dispatch(TasksApi.flushLocks(token))}
                >
                  <i className="mdi mdi-lock-reset"></i>
                </button>
              </h4>
              {!selectedItem && <Errors errors={errors}/>}
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                  <tr>
                    <th>#</th>
                    <th>Task</th>
                    <th className="text-center">Is revoked?</th>
                    <th className="text-center">Is periodic?</th>
                    <th>Status</th>
                    <th>Last Run</th>
                    <th>Events</th>
                    <th>Errors</th>
                  </tr>
                  </thead>
                  <tbody>
                  {
                    !loading
                      ? results?.length
                        ? results.map(
                          (task, i) => <tr
                            key={i}
                            onClick={() => task.id ? dispatch(selectItem(task.id)) : null}
                            className={task.id ? "cursor-pointer" : null}
                          >
                            <td>{i + 1}</td>
                            <td>{task.app}.{task.name}</td>
                            <td className="text-center">{task.is_revoked ? <i className="mdi mdi-check text-danger" /> : null}</td>
                            <td className="text-center">{task.is_periodic ? <i className="mdi mdi-check text-success" /> : null}</td>
                            {
                              task.history?.length
                                ? <>
                                  <td className={
                                    `text-${task.status === "complete" ? 'success' : task.status === "executing" ? 'warning' : 'danger'}`
                                  }
                                  >
                                    {task.status ? capitalize(task.status) : "-"}
                                  </td>
                                  <td>{new Date(task.timestamp).toLocaleString()}</td>
                                  <td>{task.history.length}</td>
                                  <td>{task.errors?.length}</td>
                                </>
                                : <td colSpan={4} className="text-center">Didn't run</td>
                            }
                          </tr>
                        )
                        : <tr>
                          <td colSpan={7}>No tasks available</td>
                        </tr>
                      : <tr>
                        <td colSpan={8}>
                          <ColorRing
                            width="100%"
                            radius="9"
                            color='green'
                            wrapperStyle={{width: "100%"}}
                          />
                        </td>
                      </tr>
                  }
                  </tbody>
                </table>
              </div>
              <Modal centered show={!!selectedItem} onHide={() => {
                dispatch(selectItem(null))
                setTaskErrorsOpen(false)
                setTaskHistoryOpen(false)
              }}
              dialogClassName="min-vw-50"

              >
                <Modal.Header closeButton>
                  <Modal.Title>
                    <div className="row">
                      <div className="col-lg-12 stretch-card">
                        {selectedItem?.name}
                        <button
                          type="button"
                          className="btn btn-outline-success btn-sm border-0 bg-transparent"
                          onClick={() => dispatch(TasksApi.getItem(token, selectedItem?.name, selectedItem?.id))}
                        >
                          <i className="mdi mdi-refresh"></i>
                        </button>
                      </div>
                    </div>
                    <p
                      className="text-muted mt-0 mb-0">App: {selectedItem?.app} </p>
                    {
                      selectedItem?.timestamp
                        ? <p className="text-muted mt-0 mb-0">Last
                          run: {selectedItem?.timestamp ? new Date(selectedItem.timestamp).toLocaleString() : null} </p>
                        : null
                    }
                    <p className="text-muted mt-0 mb-0">ID: {selectedItem?.id} </p>

                  </Modal.Title>
                </Modal.Header>
                {selectedItem && <Errors errors={errors}/>}
                <Modal.Body>
                  {
                    loadingItems?.includes(selectedItem?.id)
                      ? <ColorRing
                        width="100%"
                        radius="9"
                        color='green'
                        wrapperStyle={{width: "100%"}}
                      />
                      : <ul className="list-unstyled">
                        {
                          selectedItem
                            ? Object.keys(selectedItem).filter(k => !["timestamp", "name", "app", "id"].includes(k)).map((k, i) =>
                              ["errors", "history"].includes(k)
                                ? <li key={i}>
                                  {
                                    <div>
                                      <div style={{cursor: "pointer"}}
                                           onClick={() => k === "history" ? setTaskHistoryOpen(!taskHistoryOpen) : setTaskErrorsOpen(!taskErrorsOpen)}>
                                        <i
                                          className={`mdi mdi-chevron-${(k === "history" ? taskHistoryOpen : taskErrorsOpen) ? 'down text-success' : 'right text-primary'}`}/>
                                        {capitalize(k)} ({selectedItem[k]?.length})
                                      </div>
                                      <Collapse
                                        in={k === "history" ? taskHistoryOpen : taskErrorsOpen}>
                                        <ul className="list-unstyled">
                                          {
                                            selectedItem[k].map((h, i) =>
                                              <li key={i} className="pl-4 mt-1">
                                                <i
                                                  className="text-secondary mdi mdi-arrow-right mr-1"/>
                                                {
                                                  Object.keys(h).filter(k => k !== "id").map(hkey =>
                                                    hkey === "timestamp"
                                                      ? new Date(h[hkey]).toLocaleString()
                                                      : hkey === "status"
                                                        ? parseStatus(h[hkey])
                                                        : h[hkey]
                                                  ).join(" - ")
                                                }
                                              </li>
                                            )
                                          }
                                        </ul>
                                      </Collapse>
                                    </div>
                                  }
                                </li>
                                : k === "is_periodic"
                                  ? <li key={i}>Is periodic: {
                                    selectedItem.is_periodic ?
                                      <i className="mdi mdi-check text-success"/> :
                                      <i className="mdi mdi-close text-danger"/>
                                  }
                                  </li>
                                  : k === "is_revoked"
                                    ? <li key={i}>Is revoked: {
                                      selectedItem.is_revoked ?
                                        <i className="mdi mdi-check text-danger"/> :
                                        <i className="mdi mdi-close text-success"/>
                                    }
                                    </li>
                                    : k === "status"
                                      ?
                                      <li key={i}>Status: {parseStatus(selectedItem[k])}</li>
                                      : <li key={i}>{capitalize(k)}: {selectedItem[k]}</li>
                            )
                            : null
                        }
                      </ul>
                  }
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={e => {
                    e.preventDefault()
                    dispatch(selectItem(null))
                  }}>Close</Button>
                  <Button variant={selectedItem?.is_revoked ? "success" : "warning"}
                          className="float-left" onClick={evt => {
                    evt.preventDefault()
                    dispatch(TasksApi.revoke(token, selectedItem?.name, selectedItem?.app, selectedItem?.is_revoked ? "restore" : "revoke"))
                  }}>{selectedItem?.is_revoked ? "Restore" : "Revoke"}
                  </Button>
                  <Button variant="danger" className="float-left" onClick={evt => {
                    evt.preventDefault()
                    dispatch(TasksApi.deleteHistory(token, selectedItem?.name))
                  }}>Delete history
                  </Button>
                </Modal.Footer>
              </Modal>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Tasks;

import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from "react-redux";
import { ColorRing } from "react-loader-spinner";

import { Collapse } from "react-bootstrap";
import Errors from "../shared/Errors";
import TasksApi from "../../api/tasks";


const Tasks = () =>  {
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.token)
  const {results, errors, loading } = useSelector(state => state.tasks)
  const [taskOpen, setTaskOpen] = useState(null)
  const [taskHistoryOpen, setTaskHistoryOpen] = useState(null)

  const addStatusOpen = status => {
    if (!taskOpen?.length)
      setTaskOpen([status])
    else if (!taskOpen.includes(status))
      setTaskOpen([status])
  }
  const toggleTaskOpen = (name) => setTaskOpen(
    taskOpen?.length
      ? taskOpen.includes(name)
        ? taskOpen.filter(s => s !== name)
        : [...taskOpen, name]
      : [name]
  )
  const toggleTaskHistoryOpen = (name) => setTaskHistoryOpen(
    taskHistoryOpen?.length
      ? taskHistoryOpen.includes(name)
        ? taskHistoryOpen.filter(s => s !== name)
        : [...taskHistoryOpen, name]
      : [name]
  )

  useEffect(() => {!results && dispatch(TasksApi.getList(token))}, []);
  useEffect(() => {
    results?.map(r => r.details.status === 'executing' && addStatusOpen(r.name))
  }, [results]);

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
              </h4>
              <Errors errors={errors}/>
              <ul className="list-unstyled">
                {
                  !loading
                    ? results?.length
                      ? results.map(
                        (result, i) =>
                          <li key={i} className="mt-2">
                            <div  key={i} style={{cursor: "pointer"}} onClick={() => result.details && toggleTaskOpen(result.name)}>
                              <i className={`mdi mdi-chevron-${taskOpen?.includes(result.name) ? 'down text-success' : 'right text-primary'}`} />
                              &nbsp;{result.app}.{result.name}{result.is_periodic ? " (P)" : null}&nbsp;
                              {
                                result.details.status === 'complete'
                                  ? <i className="mdi mdi-check-circle-outline text-success" />
                                  : result.details.status === "executing"
                                    ? <i className="mdi mdi-cogs" />
                                    : null
                              }
                            </div>
                            {
                              <Collapse in={ taskOpen?.includes(result.name) }>
                                <ul className="list-unstyled">
                                  {
                                    Object.keys(result.details).filter(k => k !== "history").map((k, i) =>
                                      <li key={i} className="pl-3 mt-1">
                                        <i className="text-primary mdi mdi-chevron-right"></i>&nbsp;
                                        {k}: {result.details[k]}
                                      </li>
                                    )
                                  }
                                  {
                                    result.details.history?.length
                                      ? <div className="pl-3">
                                        <div style={{cursor: "pointer"}} onClick={() => toggleTaskHistoryOpen(result.name)}>
                                          <i className={`mdi mdi-chevron-${taskHistoryOpen?.includes(result.name) ? 'down text-success' : 'right text-primary'}`} />
                                          history
                                        </div>
                                        <Collapse in={ taskHistoryOpen?.includes(result.name) }>
                                          <ul className="list-unstyled">
                                            {
                                              result.details.history.map((h, i) =>
                                                <li key={i} className="pl-4 mt-1">
                                                  <i className="text-primary mdi mdi-chevron-right"></i>&nbsp;
                                                  {
                                                    Object.keys(h).map(hkey =>
                                                      hkey === "timestamp"
                                                        ? new Date(h[hkey]).toLocaleString()
                                                        : `${hkey}: ${h[hkey]}`).join(" ")
                                                  }
                                                </li>
                                              )
                                            }
                                          </ul>
                                        </Collapse>
                                      </div>
                                      : null
                                  }
                                </ul>
                              </Collapse>
                            }
                          </li>
                        )
                      : <tr><td colSpan={6}>No tasks available</td></tr>
                    : <tr>
                      <td colSpan={6}>
                        <ColorRing
                            width = "100%"
                            radius = "9"
                            color = 'green'
                            wrapperStyle={{width: "100%"}}
                          />
                        </td>
                      </tr>
                }
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Tasks;

import React, {useEffect, useState} from 'react'
import { useDispatch, useSelector } from "react-redux";
import LogsApi from "../../api/logs";
import { BallTriangle } from "react-loader-spinner";
import Errors from "../shared/Errors";


const Logs = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {currentLog, results: logs, errors, loading, path, } = useSelector(state => state.logs)

  useEffect(() => {!logs && dispatch(LogsApi.getList(token));}, [dispatch, logs, token]);

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Mainframe logs</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Logs</li>
          </ol>
        </nav>
      </div>
      <div className="row">
        <div className={`col-lg-${currentLog ? "4" : "12"} grid-margin stretch-card`}>
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                Available Logs
                <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(LogsApi.getList(token))}>
                  <i className="mdi mdi-refresh"></i>
                </button>
                <nav aria-label="breadcrumb">
                  <ol className="breadcrumb">
                    <li style={{cursor: "pointer"}} className="breadcrumb-item" onClick={() => dispatch(LogsApi.getList(token))}>
                      Home
                    </li>
                    {
                      path?.split("/").filter(i => !!i).map((folder, i) =>
                        <li style={{cursor: "pointer"}} key={i} className="breadcrumb-item" onClick={() => dispatch(LogsApi.getList(token, path.split("/").slice(0, i + 1).join("/")))}>
                          {folder}
                        </li>
                      )
                    }
                  </ol>
                </nav>
              </h4>
              <Errors errors={errors} />
              <ul className="list-arrow" style={{maxHeight: "60vh", overflowY: "scroll"}}>
                {
                  loading
                    ? <BallTriangle
                      visible={true}
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{}}
                      wrapperClass={{}}
                      color = '#e15b64'
                    />
                    : <>
                      {
                        path && <li style={{cursor: "pointer"}} onClick={() => dispatch(LogsApi.getList(token, path.split("/").slice(0, path.split("/").length - 1).join("/")))}>..</li>
                      }
                      {
                        logs?.map((log, i) =>
                          <li key={i} style={{cursor: "pointer"}} onClick={() =>
                            dispatch(log.is_file ? LogsApi.getFile(token, path ? `${path}/${log.name}` : log.name) : LogsApi.getList(token, path ? `${path}/${log.name}` : log.name))}
                          >
                            <i className={`mdi mdi-${log.is_file ? 'file text-default' : 'folder text-warning'}`}/> {" "}
                            {log.name.split("/")[log.name.split("/").length - 1]}
                          </li>)
                      }
                    </>
                }
              </ul>
            </div>
          </div>
        </div>
        {
          currentLog && <div className="col-lg-8 grid-margin stretch-card">
            <div className="card">
              <div className="card-body">
                <h4 className="card-title">Home{currentLog.name}</h4>
                <pre style={{maxHeight: "60vh", overflowY: "scroll"}}>
                  {currentLog.contents}
                </pre>

              </div>
            </div>
          </div>
        }
      </div>
    </div>
  )
}

export default Logs;

import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from "react-redux";
import { BallTriangle } from "react-loader-spinner";
import Alert from "react-bootstrap/Alert";
import CameraApi from "../../api/camera";
import {setAlertOpen, setMessagesOpen} from "../../redux/cameraSlice";

export const Camera = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const { alertOpen, errors, loading, messages, messagesOpen, path, results } = useSelector(state => state.camera)

  useEffect(() => {
    !results && dispatch(CameraApi.getList(token));
  }, []);

  useEffect(() => {dispatch(setAlertOpen(!!errors))}, [errors])
  useEffect(() => {dispatch(setMessagesOpen(!!messages))}, [messages])

  const [currentImage, setCurrentImage] = useState(null)
  const setImage = filename => {
    const base = process.env.NODE_ENV === 'development'
      ? "http://localhost:5678"
      : `https://${window.location.hostname}`
    setCurrentImage({
      name: filename,
      url: `${base}/static/media/${path}/${filename}`,
  })}

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Camera</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Camera</li>
          </ol>
        </nav>
      </div>
      <div className="row">
        <div className="col-lg-5 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                Available Images
                <div className="btn-group" role="group" aria-label="Basic example">
                  <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(CameraApi.getList(token))}>
                    <i className="mdi mdi-refresh"></i>
                  </button>
                </div>
                <nav aria-label="breadcrumb">
                  <ol className="breadcrumb">
                    {
                      path && <li style={{cursor: "pointer"}} className="breadcrumb-item" onClick={() => dispatch(CameraApi.getList(token))}>
                          Home
                        </li>
                    }
                    {
                      path?.split("/").filter(i => !!i).map((folder, i) =>
                        <li style={{cursor: "pointer"}} key={i} className="breadcrumb-item" onClick={() => dispatch(CameraApi.getList(token, path.split("/").slice(0, i + 1).join("/") + "/"))}>
                          {folder}
                        </li>
                      )
                    }
                  </ol>
                </nav>
              </h4>
              {alertOpen && <Alert variant="danger" dismissible onClose={() => dispatch(setAlertOpen(false))}>{errors}</Alert>}
              {messagesOpen && <Alert variant="success" dismissible onClose={() => dispatch(setMessagesOpen(false))}>
                {messages[0]}
                <small className="text-muted">{messages?.[1]}</small>
              </Alert>}
              <ul className="list-arrow" style={{maxHeight: "60vh", overflowY: "scroll"}}>
                {
                  loading ? <BallTriangle
                        visible={true}
                        width="100%"
                        ariaLabel="ball-triangle-loading"
                        wrapperStyle={{}}
                        wrapperClass={{}}
                        color = '#e15b64'
                      />
                    : results?.map((result, i) =>
                      <li
                        key={i}
                      >
                        <span
                          style={{cursor: result.is_local ? "pointer": ""}}
                          className={result.is_local ? "" : "text-muted" }
                          onClick={() =>
                            result.is_file
                              ? result.is_local ? setImage(result.name) : null
                              : dispatch(CameraApi.getList(token, result.name))}
                        >
                          <i className={`mdi mdi-${result.is_file ? 'file text-default' : 'folder text-warning'}`} /> {" "}
                          {result.name}{" "}
                        </span>
                        {
                          result.is_file && <i
                            style={{cursor: "pointer"}}
                            className={`float-right mdi mdi-${!result.is_local ? "download-outline text-primary" : "trash-can-outline text-danger"}`}
                            onClick={() =>
                              !result.is_local
                                ? dispatch(CameraApi.downloadImage(token, path + result.name))
                                : dispatch(CameraApi.deleteImage(token, path + result.name))}
                          />
                        }
                      </li>
                    )
                }
              </ul>
            </div>
          </div>
        </div>
        <div className="col-lg-7 grid-margin stretch-card">
              <div className="card">
                <div className="card-body">
                  <h4 className="card-title">{currentImage?.name}</h4>
                  <img src={currentImage?.url} alt={currentImage?.name} />
                </div>
              </div>
            </div>
      </div>
    </div>
  )
}

export default Camera

import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from "react-redux";
import {BallTriangle, Circles } from "react-loader-spinner";
import CameraApi from "../../api/camera";
import { setMessagesOpen } from "../../redux/cameraSlice";
import Errors from "../shared/Errors";
import Alert from "react-bootstrap/Alert";

export const Camera = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const { errors, loading, loadingFiles, messages, messagesOpen, path, results } = useSelector(state => state.camera)

  useEffect(() => {
    !results && dispatch(CameraApi.getList(token));
  }, []);

  useEffect(() => {dispatch(setMessagesOpen(!!messages))}, [messages])

  const [currentImage, setCurrentImage] = useState(null)
  const setImage = filename => {
    const base = process.env.NODE_ENV === 'development'
      ? "http://localhost:5678"
      : `https://${window.location.hostname}`
    setCurrentImage({
      name: filename,
      url: `${base}/static/media/${path}/${filename}`})
    const video = document.getElementById("video");
    if (video) video.load()
  }

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
                  <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(CameraApi.getList(token, path))}>
                    <i className="mdi mdi-refresh" />
                  </button>
                </div>
                <div className="text-small">
                  <a href={process.env.REACT_APP_STORAGE_URL} target="_blank" rel="noreferrer">Storage</a>
                </div>
                <nav aria-label="breadcrumb" className="mt-1">
                  <ol className="breadcrumb">
                    <li style={{cursor: "pointer"}} className="breadcrumb-item" onClick={() => dispatch(CameraApi.getList(token))}>
                      Home
                    </li>
                    {
                      path?.split("/").filter(i => !!i).map((folder, i) =>
                        <li style={{cursor: "pointer"}} key={i} className="breadcrumb-item" onClick={() => dispatch(CameraApi.getList(token, path.split("/").slice(0, i + 1).join("/")))}>
                          {folder}
                        </li>
                      )
                    }
                  </ol>
                </nav>
              </h4>
              <Errors errors={errors} />
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
                    : <>
                    {
                      path && <li style={{cursor: "pointer"}} onClick={() => dispatch(CameraApi.getList(token, path.split("/").slice(0, path.split("/").length - 1).join("/")))}>..</li>
                    }
                    {
                      !results?.length && <li>No files found</li>
                    }
                    {
                      results?.map((result, i) =>
                      <li key={i}>
                        <span
                          style={{cursor: result.is_local ? "pointer": ""}}
                          className={`${result.is_local ? "" : "text-muted"} ${result.name === currentImage?.name ? "text-success" : ""}`}
                          onClick={() =>
                            result.is_file
                              ? result.is_local ? setImage(result.name) : null
                              : result.is_local ? dispatch(CameraApi.getList(token, result.name)) : null}
                        >
                          <i className={`mdi mdi-${result.is_file ? 'file text-default' : 'folder text-warning'}`} /> {" "}
                          {result.name}{result.is_file ? ` [${result.size} MB] ` : " "}
                        </span>
                        {
                          loadingFiles?.includes(result.is_file && path ? `${path}/${result.name}` : result.name)
                          ? <Circles
                              visible={true}
                              height="15"
                              ariaLabel="ball-triangle-loading"
                              wrapperStyle={{float: "right"}}
                              color='orange'
                            />
                          : <i
                              style={{cursor: "pointer"}}
                              className={`float-right mdi mdi-${!result.is_local ? "download-outline text-primary" : "trash-can-outline text-danger"}`}
                              onClick={() =>
                                !result.is_local
                                  ? result.is_file
                                    ? dispatch(CameraApi.downloadImage(token, `${path}${path ? "/": ""}${result.name}`))
                                    : dispatch(CameraApi.createFolder(token, result.name))
                                  : result.is_file
                                    ? dispatch(CameraApi.deleteImage(token, `${path}${path ? "/": ""}${result.name}`))
                                    : dispatch(CameraApi.deleteFolder(token, result.name))}
                            />
                        }
                      </li>)
                    }
                    </>
                }
              </ul>
            </div>
          </div>
        </div>
        <div className="col-lg-7 grid-margin stretch-card">
          <div className="card">
            <div className="card-body flex-wrap d-flex">
              <h4 className="card-title">{currentImage?.name}</h4>
              {
                currentImage?.name.endsWith(".jpg")
                  ? <img className="w-100" src={currentImage?.url} alt={currentImage?.name} />
                  : currentImage?.name.endsWith(".mp4")
                    ? <video id="video" controls width="100%">
                      <source src={currentImage?.url} type="video/mp4" />
                    </video>
                    : null
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Camera

import React, {useEffect, useState} from 'react'
import { useDispatch, useSelector } from "react-redux";
import { setAlertOpen } from "../../redux/cameraSlice";
import CameraApi from "../../api/camera";
import Alert from "react-bootstrap/Alert";
import { BallTriangle } from "react-loader-spinner";


const Camera = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {results, errors, alertOpen, loading, path } = useSelector(state => state.camera)

  useEffect(() => {
    !results && dispatch(CameraApi.getList(token));
  }, []);

  useEffect(() => {dispatch(setAlertOpen(!!errors))}, [errors])

  const [currentImage, setCurrentImage] = useState(null)

  const setImage = filename => {
    const base = process.env.NODE_ENV === 'development'
      ? "http://localhost:5678"
      : `https://${window.location.hostname}`
    setCurrentImage({
      name: filename,
      url: `${base}/static/media/${filename}`,
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
        <div className="col-lg-4 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                Available Images
                <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(CameraApi.getList(token))}>
                  <i className="mdi mdi-refresh"></i>
                </button>
                <nav aria-label="breadcrumb">
                  <ol className="breadcrumb">
                    {
                      path && <li style={{cursor: "pointer"}} className="breadcrumb-item" onClick={() => dispatch(CameraApi.getList(token))}>
                          Home
                        </li>
                    }
                    {
                      path?.split("/").filter(i => !!i).map((folder, i) =>
                        <li style={{cursor: "pointer"}} key={i} className="breadcrumb-item" onClick={() => dispatch(CameraApi.getList(token, path.split("/").slice(0, i + 2).join("/")))}>
                          {folder}
                        </li>
                      )
                    }
                  </ol>
                </nav>
              </h4>
              {alertOpen && <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>{errors}</Alert>}
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
                      <li key={i} style={{cursor: "pointer"}} onClick={() =>
                        result.is_file ? setImage(result.name) : dispatch(CameraApi.getList(token, result.name))}
                      >
                        <i className={`mdi mdi-${result.is_file ? 'file text-default' : 'folder text-warning'}`} /> {" "}
                        {result.name.split("/")[result.name.split("/").length - 1]}
                      </li>
                    )
                }
              </ul>
            </div>
          </div>
        </div>
        <div className="col-lg-8 grid-margin stretch-card">
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

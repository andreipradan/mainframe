import React, { useEffect } from 'react'
import {useDispatch, useSelector} from "react-redux";
import { setAlertOpen } from "../../redux/cameraSlice";
import CameraApi from "../../api/camera";
import Alert from "react-bootstrap/Alert";
import {BallTriangle} from "react-loader-spinner";

export const Camera = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {results, errors, alertOpen, currentFile, loading, path } = useSelector(state => state.camera)

  useEffect(() => {
    !results && dispatch(CameraApi.getList(token));
  }, []);

  useEffect(() => {dispatch(setAlertOpen(!!errors))}, [errors])

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Livecam
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={evt =>evt.preventDefault()}>Apps</a></li>
          <li className="breadcrumb-item active" aria-current="page">Camera</li>
        </ol>
      </nav>
    </div>
    <div className="row">
      <div className="col-lg-12">
        <div className="card px-3">
          <div className="card-body">
            <h4 className="card-title">
              Captured files &nbsp;
              <button type="button" className="btn btn-xs btn-inverse-primary" onClick={() => dispatch(CameraApi.takePicture(token, "start"))}>
                <i className="mdi mdi-camera"></i>
              </button>
            </h4>

            {alertOpen && <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>{errors}</Alert>}
            <div className={`col-lg-${currentFile ? "4" : "12"} stretch-card`}>
              <div className="card">
                <div className="card-body">
                  <h4 className="card-title">
                    Available files
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
                            dispatch(result.is_file ? CameraApi.getFile(token, result.name) : CameraApi.getList(token, result.name))}
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
            {
              currentFile && <div className="col-lg-8 grid-margin stretch-card">
                <div className="card">
                  <div className="card-body">
                    <h4 className="card-title">Home{currentFile.name}</h4>
                    <img src={`data:image/jpeg;charset=utf-8;base64,${currentFile.contents}`} alt={currentFile.name} />
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  </div>
}

export default Camera

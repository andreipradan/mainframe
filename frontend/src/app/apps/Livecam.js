import React, { useEffect } from 'react'
import {useDispatch, useSelector} from "react-redux";
import {add} from "../../redux/livecamSlice";
import CameraApi from "../../api/camera";

export const Livecam = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {results: messages, errors, loading } = useSelector(state => state.livecam)

  useEffect(() => {
    const socket = startSocketConnection()
    return () => socket.close()
  }, []);

  const startSocketConnection = () => {
    console.log("starting socket connection")
    const socketHost = process.env.NODE_ENV === 'development'
      ? `ws://${window.location.hostname}:5678`
      : `wss://${window.location.hostname}`;

    const socket = new WebSocket(`${socketHost}/ws/camera/`);
    socket.onmessage = e => {dispatch(add(JSON.parse(e.data)["message"]))};
    socket.onclose = () => {console.log("socket closed")}
    socket.onopen = () => {console.log("opened socket")}
    return socket
  };

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Livecam
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={evt =>evt.preventDefault()}>Apps</a></li>
          <li className="breadcrumb-item active" aria-current="page">Livecam</li>
        </ol>
      </nav>
    </div>
    <div className="row">
      <div className="col-lg-12">
        <div className="card px-3">
          <div className="card-body">
            <h4 className="card-title">Streaming</h4>
            <div className="btn-group" role="group" aria-label="Basic example">
              <button type="button" className="btn btn-inverse-success" onClick={() => dispatch(CameraApi.streaming(token, "start"))}>
                <i className="mdi mdi-play-outline"></i>
              </button>
              <button type="button" className="btn btn-inverse-danger"  onClick={() => dispatch(CameraApi.streaming(token, "stop"))}>
                <i className="mdi mdi-stop"></i>
              </button>
            </div>
            <ul>
              {messages?.map((m, i) => <li key={i}>{m}</li>)}

            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
}

export default Livecam

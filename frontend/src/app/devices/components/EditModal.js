import React, {useEffect, useState} from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import {select} from "../../../redux/devicesSlice";
import 'ace-builds'
import 'ace-builds/webpack-resolver'

import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import {ColorRing} from "react-loader-spinner";
import DevicesApi from "../../../api/devices";

const EditModal = () => {
  const dispatch = useDispatch();
  const device = useSelector(state => state.devices.selectedDevice)
  const token = useSelector((state) => state.auth.token)
  const loadingDevices = useSelector(state => state.devices.loadingDevices)

  const [name, setName] = useState("");

  useEffect(() => {
    if (device) {setName(device.name || "")}
  }, [device]);

  return <Modal centered show={!!device} onHide={() => dispatch(select())}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card">
            Edit {device?.name || device?.ip }
          </div>
        </div>
        <p className="text-muted mb-0">{device?.mac}</p>
      </Modal.Title>
    </Modal.Header>
    {
      loadingDevices?.includes(device?.id)
      ? <ColorRing
          width = "100%"
          height = "50"
          wrapperStyle={{width: "100%"}}
        />
      : <Modal.Body>
      <Form onSubmit={
        (e) => {
          e.preventDefault()
          dispatch(DevicesApi.updateDevice(token, device.id, {name: name}))
          dispatch(select())
        }
      }>
        <Form.Group className="mb-3">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </Form.Group>
      </Form>
    </Modal.Body>
    }
    <Modal.Footer>
      <Button variant="danger" className="float-left" onClick={() => dispatch(DevicesApi.delete(token, device.id))}>
        Delete
      </Button>
      <Button variant="secondary" onClick={() => dispatch(select())}>
        Close
      </Button>
      <Button variant="primary" onClick={() => {
        dispatch(DevicesApi.updateDevice(token, device.id, {name: name}))
        dispatch(select())
      }}>
        Save Changes
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;

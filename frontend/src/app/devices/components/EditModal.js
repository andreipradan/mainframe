import React, {useEffect, useState} from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import { selectItem, setModalOpen } from '../../../redux/devicesSlice';
import 'ace-builds'
import 'ace-builds/webpack-resolver'

import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import {ColorRing} from "react-loader-spinner";
import DevicesApi from "../../../api/devices";

const EditModal = () => {
  const dispatch = useDispatch();
  const { selectedItem: device, modalOpen, loadingItems: loadingDevices } = useSelector(state => state.devices)
  const token = useSelector((state) => state.auth.token)

  const [ip, setIp] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [mac, setMac] = useState("");
  const [name, setName] = useState("");

  const clearModal = () => {
    setIp("")
    setIsActive(false)
    setMac("")
    setName("")
  }

  const closeModal = () => {
    dispatch(selectItem())
    dispatch(setModalOpen(false))
    clearModal()
  }

  useEffect(() => {
    if (device) {
      setIp(device.ip || "")
      setIsActive(device.is_active || false)
      setMac(device.mac || "")
      setName(device.name || "")
    }
  }, [device]);

  return <Modal centered show={!!device || modalOpen} onHide={closeModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card">
            {device ? 'Edit' : 'Add new device'} {device?.name || device?.ip }
          </div>
        </div>
        {device ? <p className="text-muted mb-0">{device?.mac}</p> : null}
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
      <Form onSubmit={(e) => e.preventDefault()}>
        <Form.Group className="mb-3">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Is Active?</Form.Label>
          <Form.Check
            checked={isActive}
            type="switch"
            id="checkbox"
            label=""
            onChange={() => {setIsActive(!isActive)}}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>IP</Form.Label>
          <Form.Control
            type="text"
            value={ip}
            required
            onChange={e => setIp(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Mac</Form.Label>
          <Form.Control
            type="text"
            value={mac}
            required
            readOnly={!!device}
            onChange={e => setMac(e.target.value)}
          />
        </Form.Group>
      </Form>
    </Modal.Body>
    }
    <Modal.Footer>
      {
        !!device && <Button variant="danger" className="float-left" onClick={() => dispatch(DevicesApi.delete(token, device.id))}>
          Delete
        </Button>
      }

      <Button variant="secondary" onClick={closeModal}>
        Close
      </Button>
      <Button variant="primary" onClick={() => {
        if (device) {
          dispatch(DevicesApi.updateDevice(token, device.id, { ip:ip, is_active: isActive, name: name }));
        } else {
          dispatch(DevicesApi.create(token, {ip: ip, is_active: isActive, mac: mac, name: name}))
        }
        closeModal()
      }}>
        {!!device ? "Update" : "Add"}
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;

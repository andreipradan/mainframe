import React, {useEffect, useState} from "react";
import { useDispatch, useSelector } from "react-redux";
import AceEditor from 'react-ace';
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import {ColorRing} from "react-loader-spinner";

import 'ace-builds'
import 'ace-builds/webpack-resolver'
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";

import DevicesApi from "../../api/devices";
import { selectItem, setModalOpen } from '../../redux/devicesSlice';
import { Tooltip } from 'react-tooltip';
import Errors from '../shared/Errors';

const EditModal = () => {
  const dispatch = useDispatch();
  const { selectedItem: device, modalOpen, loadingItems: loadingDevices, errors } = useSelector(state => state.devices)
  const token = useSelector((state) => state.auth.token)
  const api = new DevicesApi(token)

  const [additionalData, setAdditionalData] = useState(null);
  const [alias, setAlias] = useState("");
  const [ip, setIp] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [mac, setMac] = useState("");
  const [name, setName] = useState("");
  const [shouldNotifyPresence, setShouldNotifyPresence] = useState(false)

  const [additionalDataAnnotations, setAdditionalDataAnnotations] = useState(null)

  const clearModal = () => {
    setAdditionalData(null)
    setAlias("")
    setIp("")
    setIsActive(false)
    setMac("")
    setName("")
    setShouldNotifyPresence(true)
  }

  const closeModal = () => {
    dispatch(selectItem())
    dispatch(setModalOpen(false))
    clearModal()
  }

  const onAdditionalDataChange = (e, i) => {
    setAdditionalData(e)
    try {
      JSON.parse(e)
      setAdditionalDataAnnotations(null)
    }
    catch (error) {
      const annotation = {...i.end, text: error.message, type: 'error'}
      setAdditionalDataAnnotations(!additionalDataAnnotations ? [annotation] : [...additionalDataAnnotations, annotation])
    }
  }
  const onSubmit = e => {
    e.preventDefault()
    const data = {
      alias,
      ip,
      is_active: isActive,
      name,
      should_notify_presence: shouldNotifyPresence,
    }
    if (additionalData)
      data.additional_data = JSON.parse(additionalData.replace(/[\r\n\t]/g, ""))
    if (device) {
      dispatch(api.update(device.id, data));
    } else {
      data.mac = mac
      dispatch(api.create(data))
    }
  }
  useEffect(() => {
    if (device) {
      setAdditionalData(JSON.stringify(device.additional_data, null, "\t"))
      setAlias(device.alias)
      setIp(device.ip)
      setIsActive(device.is_active)
      setMac(device.mac)
      setName(device.name)
      setShouldNotifyPresence(device.should_notify_presence)
    }
  }, [device]);

  return <Modal centered show={Boolean(device) || modalOpen} onHide={closeModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card">
            {device ? 'Edit' : 'Add new device'} {device?.display_name } ?
          </div>
        </div>
        {
          device
            ? <p className="text-muted mb-0">
                {device.should_notify_presence ? null : <span><i className="mdi mdi-bell-off" /> Telegram notifications turned off<br/></span>}
                {device?.mac}
              </p>
            : null
        }
        {modalOpen ? <Errors errors={errors} /> : null}

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
      <Form onSubmit={onSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Name</Form.Label>
          <Form.Control
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Alias</Form.Label>
          <Form.Control
            type="text"
            value={alias}
            onChange={e => setAlias(e.target.value)}
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
          <Form.Label>
            Should notify presence?&nbsp;
            <sup><i id="should-notify-presence" className="mdi mdi-information-outline" /></sup>
          </Form.Label>
          <Form.Check
            checked={shouldNotifyPresence}
            type="switch"
            id="notify-checkbox"
            label=""
            onChange={() => {setShouldNotifyPresence(!shouldNotifyPresence)}}
          />
        </Form.Group>
        {
          !device && <Form.Group className="mb-3">
          <Form.Label>Mac</Form.Label>
          <Form.Control
            type="text"
            value={mac}
            required
            readOnly={Boolean(device)}
            onChange={e => setMac(e.target.value)}
          />
        </Form.Group>
        }
        <Form.Group className="mb-3">
          <Form.Label>Additional Data</Form.Label>
          <AceEditor
            className={(additionalDataAnnotations) ? "form-control is-invalid" : ""}
            annotations={additionalDataAnnotations}
            placeholder="Config"
            mode="python"
            theme="monokai"
            onChange={onAdditionalDataChange}
            fontSize={12}
            showPrintMargin
            showGutter
            highlightActiveLine
            value={additionalData}
            setOptions={{
              enableBasicAutocompletion: false,
              enableLiveAutocompletion: false,
              enableSnippets: false,
              showLineNumbers: true,
              tabSize: 2,
            }}
            width="100%"
            height="150px"
          />

        </Form.Group>
      </Form>
    </Modal.Body>
    }
    <Modal.Footer>
      {
        Boolean(device) && <Button variant="danger" className="float-left" onClick={() => dispatch(api.delete(device.id, device.display_name))}>
          Delete
        </Button>
      }

      <Button variant="secondary" onClick={closeModal}>
        Close
      </Button>
      <Button variant="primary" onClick={onSubmit}>
        {device ? "Update" : "Add"}
      </Button>
    </Modal.Footer>
    <Tooltip anchorSelect="#should-notify-presence" place="bottom-start">
      Used to send notifications on Telegram<br/>
      when this device goes online or offline<br/>
    </Tooltip>
  </Modal>
}
export default EditModal;

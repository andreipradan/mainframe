import React, {useEffect, useState} from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import { select } from "../../../redux/cronsSlice";
import 'ace-builds'
import 'ace-builds/webpack-resolver'

import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import {ColorRing} from "react-loader-spinner";
import CronsApi from "../../../api/crons";

const EditModal = () => {
  const dispatch = useDispatch();
  const cron = useSelector(state => state.crons.selectedCron)
  const token = useSelector((state) => state.auth.token)
  const loadingCrons = useSelector(state => state.crons.loadingCrons)

  const [command, setCommand] = useState("");
  const [expression, setExpression] = useState("");

  useEffect(() => {
    if (cron) {
      setCommand(cron.command || "")
      setExpression(cron.expression)
    }
  }, [cron]);

  return <Modal centered show={!!cron} onHide={() => dispatch(select())}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card">
            Edit { cron?.command }
          </div>
        </div>
        <p className="text-muted mb-0">{cron?.description}</p>
        <p className="text-muted mb-0">Args: {cron?.arguments?.length && cron.arguments.join(" ")}</p>
      </Modal.Title>
    </Modal.Header>
    {
      loadingCrons?.includes(cron?.id)
      ? <ColorRing
          width = "100%"
          height = "50"
          wrapperStyle={{width: "100%"}}
        />
      : <Modal.Body>
      <Form onSubmit={
        (e) => {
          e.preventDefault()
          dispatch(CronsApi.updateCron(token, cron.id, {command: command}))
          dispatch(select())
        }
      }>
        <Form.Group className="mb-3">
          <Form.Label>Command</Form.Label>
          <Form.Control
            type="text"
            autoFocus
            value={command}
            onChange={e => setCommand(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Expression</Form.Label>
          <Form.Control
            type="text"
            autoFocus
            value={expression}
            onChange={e => setExpression(e.target.value)}
          />
        </Form.Group>
      </Form>
    </Modal.Body>
    }
    <Modal.Footer>
      <Button variant="danger" className="float-left" onClick={() => dispatch(CronsApi.delete(token, cron.id))}>
        Delete
      </Button>
      <Button variant="secondary" onClick={() => dispatch(select())}>
        Close
      </Button>
      <Button variant="primary" onClick={() => {
        dispatch(CronsApi.updateCron(token, cron.id, {command: command, expression: expression}))
        dispatch(select())
      }}>
        Save Changes
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;

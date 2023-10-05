import React, {useEffect, useState} from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import {select, setModalOpen} from "../../../redux/cronsSlice";
import 'ace-builds'
import 'ace-builds/webpack-resolver'

import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import {ColorRing} from "react-loader-spinner";
import CronsApi from "../../../api/crons";
import Errors from "../../shared/Errors";

const EditModal = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {selectedCron: cron, loadingCrons, errors, modalOpen} = useSelector(state => state.crons)

  const [command, setCommand] = useState("");
  const [expression, setExpression] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isManagement, setIsManagement] = useState(false);

  useEffect(() => {
    if (cron) {
      setCommand(cron.command || "")
      setExpression(cron.expression)
      setIsActive(cron.is_active)
      setIsManagement(cron.is_management)
    }
  }, [cron]);

  const clearModal = () => {
    setCommand("")
    setExpression("")
    setIsActive(false)
    setIsManagement(false)
  }

  const closeModal = () => {
    dispatch(select())
    dispatch(setModalOpen(false))
    clearModal()
  }
  return <Modal centered show={!!cron || modalOpen} onHide={closeModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card">
            {cron ? 'Edit' : 'Add new cron'} { cron?.command }
          </div>
        </div>
        {
          cron && <>
            <p className="text-muted mb-0">{cron?.description}</p>
          </>
        }
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
        <Errors errors={errors}/>
        <Form.Group className="mb-3">
          <Form.Label>Command</Form.Label>
          <Form.Control
            type="text"
            
            value={command}
            onChange={e => setCommand(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Expression</Form.Label>
          <Form.Control
            type="text"
            
            value={expression}
            onChange={e => setExpression(e.target.value)}
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
          <Form.Label>Is Management Command?</Form.Label>
          <Form.Check
            checked={isManagement}
            type="switch"
            id="checkbox-2"
            label=""
            onChange={() => {setIsManagement(!isManagement)}}
          />
        </Form.Group>
      </Form>
    </Modal.Body>
    }
    <Modal.Footer>
      {
        cron && <Button variant="danger" className="float-left" onClick={() => dispatch(CronsApi.delete(token, cron.id))}>
          Delete
        </Button>
      }
      <Button variant="secondary" onClick={closeModal}>Close</Button>
      <Button
          variant="primary"
          onClick={() => {
            if (cron)
                dispatch(CronsApi.updateCron(
                  token,
                  cron.id,
                  {
                    command: command,
                    expression: expression,
                    is_active: isActive,
                    is_management: isManagement,
                  }
              ))
              else dispatch(CronsApi.create(token, {
                    command: command,
                    expression: expression,
                    is_active: isActive,
                    is_management: isManagement,
                  }))
              clearModal()
          }}
      >
        Save Changes
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;

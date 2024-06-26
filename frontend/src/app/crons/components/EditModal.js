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
import AceEditor from "react-ace";

const EditModal = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {selectedCron: cron, loadingCrons, errors, modalOpen} = useSelector(state => state.crons)

  const [annotations, setAnnotations] = useState(null);
  const [args, setArgs] = useState("");
  const [command, setCommand] = useState("");
  const [expression, setExpression] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [kwargs, setKwargs] = useState(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (cron) {
      setArgs(cron.args?.length ? cron.args.join("\n") : "")
      setCommand(cron.command || "")
      setExpression(cron.expression)
      setIsActive(cron.is_active)
      setKwargs(JSON.stringify(cron.kwargs, null, "\t"))
      setName(cron.name)
    }
  }, [cron]);

  const clearModal = () => {
    setArgs("")
    setCommand("")
    setExpression("")
    setIsActive(false)
    setKwargs(null)
    setName("")
  }

  const closeModal = () => {
    dispatch(select())
    dispatch(setModalOpen(false))
    clearModal()
  }

  const onKwargsChange = (e, i) => {
    setKwargs(e)
    try {
      JSON.parse(e)
      setAnnotations(null)
    }
    catch (error) {
      const annotation = {...i.end, text: error.message, type: 'error'}
      setAnnotations(!annotations ? [annotation] : [...annotations, annotation])
    }
  }

  return <Modal centered show={!!cron || modalOpen} onHide={closeModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card">
            {cron ? 'Edit' : 'Add new cron'} { cron?.name }
          </div>
        </div>
        {cron && <p className="text-muted mb-0">{cron?.description}</p>}
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
          <Form.Label>Args</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={args || ""}
            placeholder={"args"}
            onChange={e => setArgs(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Kwargs</Form.Label>
          <AceEditor
            className={(annotations) ? "form-control is-invalid" : ""}
            annotations={annotations}
            placeholder="Kwargs"
            mode="python"
            theme="monokai"
            onChange={onKwargsChange}
            fontSize={12}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
            value={kwargs}
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
                    args: args ? args.split("\n") : [],
                    command: command,
                    expression: expression,
                    is_active: isActive,
                    kwargs: JSON.parse(kwargs.replace(/[\r\n\t]/g, "")),
                    name: name
                  }
              ))
              else dispatch(CronsApi.create(token, {
                    args: args ? args.split("\n") : [],
                    command: command,
                    expression: expression,
                    is_active: isActive,
                    kwargs: JSON.parse(kwargs.replace(/[\r\n\t]/g, "")),
                    name: name
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

import React, {useEffect, useRef, useState} from 'react'
import { useDispatch, useSelector } from "react-redux";
import { ColorRing } from "react-loader-spinner";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

import CommandsApi from "../../api/commands";
import EditModal from "../crons/components/EditModal";
import Errors from "../shared/Errors";
import {Col, Collapse, Row} from "react-bootstrap";
import Form from "react-bootstrap/Form";


const Commands = () =>  {
  const dispatch = useDispatch();
  const commandArgumentsRef = useRef()
  const token = useSelector((state) => state.auth.token)
  const {results, errors, loading } = useSelector(state => state.commands)

  const [appOpen, setAppOpen] = useState(null)
  const [commandArguments, setCommandArguments] = useState("")
  const [cron, setCron] = useState("")
  const [selectedCommand, setSelectedCommand] = useState(null)

  const clearForm = () => {
    setCommandArguments("")
    setCron("")
    setSelectedCommand(null)
  }
  const onSubmit = (e, operation = "run") => {
    e.preventDefault()
    if (operation === "run")
      dispatch(CommandsApi.run(token, selectedCommand.name, commandArguments))
    else if (operation === "set-cron")
      dispatch(CommandsApi.setCron(token, selectedCommand.name, cron, selectedCommand?.cron?.id))
    else if (operation === "delete-cron")
      dispatch(CommandsApi.deleteCron(token, selectedCommand.name, selectedCommand?.cron?.id))
    clearForm()
  }

  useEffect(() => {!results && dispatch(CommandsApi.getList(token))}, []);
  useEffect(() => {
    if (selectedCommand) {
      commandArgumentsRef.current && commandArgumentsRef.current.focus()
      setCron(selectedCommand.cron?.expression)
    }
  }, [selectedCommand]);

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Management Commands</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Management Commands</li>
          </ol>
        </nav>
      </div>
      <div className="row">
        <div className="col-lg-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                Available commands
                <button
                    type="button"
                    className="btn btn-outline-success btn-sm border-0 bg-transparent"
                    onClick={() => dispatch(CommandsApi.getList(token))}
                >
                  <i className="mdi mdi-refresh"></i>
                </button>
              </h4>
              <Errors errors={errors}/>
              <ul className="list-unstyled">
                {
                  !loading
                    ? results?.length
                      ? results.map(
                        (result, i) =>
                          <li key={i} className="mt-2">
                            <div  key={i} style={{cursor: "pointer"}} onClick={() => appOpen === result.app ? setAppOpen(null) : setAppOpen(result.app)}>
                              <i className={`mdi mdi-chevron-${appOpen === result.app ? 'down text-success' : 'right text-primary'}`} />
                              &nbsp;{result.app}
                            </div>
                            <Collapse in={ appOpen === result.app }>
                              <ul className="list-unstyled">
                                {
                                  result.commands.length
                                    ? result.commands.map((command, i) =>
                                      <li
                                        key={i}
                                        className="pl-3 mt-1 cursor-pointer"
                                        onClick={() => setSelectedCommand(command)}
                                      >
                                        <i className="mdi mdi-play text-success"></i> {command.name}
                                      </li>)
                                    : null
                                }
                              </ul>
                            </Collapse>
                          </li>
                        )
                      : <tr><td colSpan={6}>No commands available</td></tr>
                    : <tr>
                      <td colSpan={6}>
                        <ColorRing
                          width = "100%"
                          radius = "9"
                          color = 'green'
                          wrapperStyle={{width: "100%"}}
                        />
                      </td>
                    </tr>
                }
              </ul>
            </div>
          </div>
        </div>
      </div>
      <EditModal />
      <Modal centered show={!!selectedCommand} onHide={clearForm}>
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="row">
              <div className="col-lg-12 grid-margin stretch-card">
                {selectedCommand?.name}
              </div>
            </div>
            <p className="text-muted mb-0">
              Run / Set cron for <b>{selectedCommand?.name}</b>
            </p>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Row>
                <Col md={6}>
                  <Form.Control
                    type="text"
                    value={cron}
                    onChange={e => setCron(e.target.value)}
                    placeholder={"Cron"}
                  />
                </Col>
                <Col md={3}>
                  <Button
                    disabled={!cron}
                    variant="warning"
                    className="h-100 w-100"
                    onClick={evt => {onSubmit(evt, "set-cron")}}
                  >
                    Set
                  </Button>
                </Col>
                <Col md={3}>
                  <Button
                    disabled={!selectedCommand?.cron}
                    variant="outline-danger"
                    className="h-100 w-100"
                    onClick={evt => {onSubmit(evt, "delete-cron")}}
                  >
                    <i className="mdi mdi-trash-can-outline" />
                  </Button>
                </Col>
              </Row>
            </Form.Group>
            <Form.Group className="mb-3">
              <Row>
                <Col md={9}>
                  <Form.Control
                    ref={commandArgumentsRef}
                    type="text"
                    value={commandArguments}
                    onChange={e => setCommandArguments(e.target.value)}
                    placeholder={"Command arguments"}
                  />
                </Col>
                <Col md={3}>
                  <Button
                    variant="primary"
                    className="float-left h-100 w-100"
                    onClick={evt => {onSubmit(evt)}}
                  >
                    Run
                  </Button>
                </Col>
              </Row>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={e => {
            e.preventDefault()
            clearForm()
          }}>Close</Button>

        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Commands

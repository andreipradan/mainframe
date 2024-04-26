import React, {useEffect, useRef, useState} from 'react'
import { useDispatch, useSelector } from "react-redux";
import { ColorRing } from "react-loader-spinner";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

import CommandsApi from "../../api/commands";
import EditModal from "../crons/components/EditModal";
import Errors from "../shared/Errors";
import {Collapse} from "react-bootstrap";
import Form from "react-bootstrap/Form";


const Commands = () =>  {
  const dispatch = useDispatch();
  const commandArgumentsRef = useRef()
  const token = useSelector((state) => state.auth.token)
  const {results, errors, loading } = useSelector(state => state.commands)

  const [appOpen, setAppOpen] = useState(null)
  const [commandArguments, setCommandArguments] = useState("")
  const [selectedCommand, setSelectedCommand] = useState(null)

  const onSubmit = e => {
    e.preventDefault()
    dispatch(CommandsApi.run(token, selectedCommand, commandArguments))
    setCommandArguments("")
    setSelectedCommand(null)
  }

  useEffect(() => {!results && dispatch(CommandsApi.getList(token))}, []);
  useEffect(() => {
    selectedCommand && commandArgumentsRef.current && commandArgumentsRef.current.focus()
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
                                      <li key={i} className="pl-3 mt-1">
                                        <button
                                          type="button "
                                          className="btn btn-sm btn-outline-primary border-0"
                                          onClick={() => setSelectedCommand(command)}
                                        >
                                          <i className="mdi mdi-play"></i>
                                        </button>&nbsp;
                                        {command}

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
      <Modal centered show={!!selectedCommand} onHide={() => setSelectedCommand(null)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="row">
              <div className="col-lg-12 grid-margin stretch-card">
                Are you sure you want to run "{selectedCommand}"?
              </div>
            </div>
            <p className="text-muted mb-0">
              This will run <b>{selectedCommand}</b>
            </p>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Command Arguments</Form.Label>
              <Form.Control
                ref={commandArgumentsRef}
                type="text"
                value={commandArguments}
                onChange={e => setCommandArguments(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={e => {
            e.preventDefault()
            setCommandArguments("")
            setSelectedCommand(null)
          }}>Close</Button>
          <Button variant="warning" className="float-left" onClick={evt => {onSubmit(evt)}}>
            Yes, run it!
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Commands

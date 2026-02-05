import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { ColorRing } from "react-loader-spinner";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

import CommandsApi from "../../api/commands";
import Errors from "../shared/Errors";
import { Collapse } from "react-bootstrap";
import Form from "react-bootstrap/Form";
import AceEditor from 'react-ace';
import 'ace-builds'
import 'ace-builds/webpack-resolver'
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";


const Commands = () =>  {
  const dispatch = useDispatch();
  const commandArgumentsRef = useRef()
  const token = useSelector((state) => state.auth.token)
  const {results, errors, loading } = useSelector(state => state.commands)

  const api = new CommandsApi(token)

  const [appOpen, setAppOpen] = useState(null)
  const [commandArguments, setCommandArguments] = useState(null)
  const [kwargs, setKwargs] = useState(null);
  const [selectedCommand, setSelectedCommand] = useState(null)

  const [annotations, setAnnotations] = useState(null);

  const clearForm = () => {
    setCommandArguments(null)
    setKwargs(null);
    setSelectedCommand(null)
  }
  const onKwargsChange = useCallback((e, i) => {
    setKwargs(e)
    try {
      JSON.parse(e)
      setAnnotations(null)
    }
    catch (error) {
      const annotation = {...i.end, text: error.message, type: 'error'}
      setAnnotations(!annotations ? [annotation] : [...annotations, annotation])
    }
  }, [annotations])
  const onSubmit = e => {
    e.preventDefault()
    const data = {}
    if (commandArguments)
      data.args = commandArguments.split(" ")
    if (kwargs) data.kwargs = JSON.parse(kwargs.replace(/[\r\n\t]/g, ""))

    dispatch(api.run(selectedCommand.name, data))
    clearForm()
  }

  useEffect(() => {!results && dispatch(api.getList())}, []);
  useEffect(() => {
    if (selectedCommand) {
      commandArgumentsRef.current?.focus()
      const placeholders = {
        str: "<placeholder str>",
        bool: false,
        int: 0,
        float: 0.0,
        dict: {},
        list: [],
      }
      if (selectedCommand.args) {
        const kw = selectedCommand.args.reduce((result, item) => {
          if (item.required) {
            result[item.dest] = item.default !== null && item.default !== undefined
              ? item.default
              : placeholders[item.type] ?? null;

          }
          return result;
        }, {});
        setKwargs(JSON.stringify(kw, null, "\t"));
      }
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
                    onClick={() => dispatch(api.getList())}
                >
                  <i className="mdi mdi-refresh" />
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
                                        <i className="mdi mdi-play text-success" /> {command.name}
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
      <Modal centered show={Boolean(selectedCommand)} onHide={clearForm}>
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="row">
              <div className="col-lg-12 grid-margin stretch-card">
                Run {selectedCommand?.name}?
              </div>
            </div>
            {
              selectedCommand?.args?.length
                ? <p className="text-muted mb-0">
                    Params:
                    <ul>
                      {selectedCommand.args.map(arg =>
                        <li key={arg.dest}>
                          {arg.dest}
                          <ul>
                            <li>required: {arg.required.toString()}</li>
                            {arg.type ? <li>type: {arg.type}</li> : null}
                            {arg.choices ? <li>choices: {arg.choices.join(', ')}</li> : null}
                            {arg.default ? <li>default: {arg.default}</li> : null}
                            {arg.help ? <li>description: {arg.help}</li> : null}
                          </ul>
                        </li>)}
                    </ul>
                  </p>
                : null
            }

          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Args</Form.Label>
              <Form.Control
                ref={commandArgumentsRef}
                type="text"
                value={commandArguments}
                onChange={e => setCommandArguments(e.target.value)}
                placeholder={'Command arguments'}
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
                showGutter={false}
                highlightActiveLine
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
        <Modal.Footer>
          <Button variant="secondary" onClick={e => {
            e.preventDefault()
            clearForm()
          }}>Close</Button>
          <Button variant="primary" onClick={evt => {onSubmit(evt)}}>
            Run
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Commands

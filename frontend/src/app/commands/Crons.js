import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import {Audio, ColorRing} from "react-loader-spinner";
import AceEditor from 'react-ace';
import Button from "react-bootstrap/Button";
import Form from 'react-bootstrap/Form';
import Modal from "react-bootstrap/Modal";
import Select from 'react-select';

import CommandsApi from '../../api/commands';
import CronsApi from "../../api/crons";
import Errors from "../shared/Errors";
import { capitalize } from '../utils';
import { select, setModalOpen } from "../../redux/cronsSlice";
import { selectStyles } from '../finances/Accounts/Categorize/EditModal';


export const NOTSET = 0
export const DEBUG = 10
export const INFO = 20
export const WARNING = 30
export const ERROR = 40
export const CRITICAL = 50

export const logLevels = {
  [NOTSET]: {label: "NOTSET", value: NOTSET},
  [DEBUG]: {label: "DEBUG", value: DEBUG},
  [INFO]: {label: "INFO", value: INFO},
  [WARNING]: {label: "WARNING", value: WARNING},
  [ERROR]: {label: "ERROR", value: ERROR},
  [CRITICAL]: {label: "CRITICAL", value: CRITICAL},
}

const Crons = () =>  {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const {selectedItem, results: crons, errors, loading, loadingItems, modalOpen } = useSelector(state => state.crons)
  const commands = useSelector(state => state.commands)

  const api = new CronsApi(token)

  const [selectedAction, setSelectedAction] = useState("")
  const [selectedActionCron, setSelectedActionCron] = useState(null)

  const [annotations, setAnnotations] = useState(null);
  const [allCommands, setAllCommands] = useState(null)
  const [command, setCommand] = useState(null);
  const [expression, setExpression] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [kwargs, setKwargs] = useState(null);
  const [logLevel, setLogLevel] = useState(null);
  const [redis, setRedis] = useState(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (commands.results) {
      const allCommands = []
      for (const app of commands.results) {
        for (const cmd of app.commands)
          allCommands.push({ label: `${app.app}.${cmd.name}`, value: cmd.name, args: cmd.args });
      }
      setAllCommands(allCommands)
    }
  }, [commands.results]);
  useEffect(() => {
    if (selectedItem) {
      setCommand(allCommands?.find(c => c.value === selectedItem.command) || null)
      setExpression(selectedItem.expression)
      setIsActive(selectedItem.is_active)
      setKwargs(JSON.stringify(selectedItem.kwargs, null, "\t"))
      setLogLevel(logLevels[selectedItem.log_level])
      setRedis(JSON.stringify(selectedItem.redis, null, "\t"))
      setName(selectedItem.name)
    }
    if (!commands.results) dispatch(new CommandsApi(token).getList())
  }, [allCommands, commands.results, selectedItem, dispatch, token]);

  const clearModal = () => {
    setCommand(null)
    setExpression("")
    setIsActive(false)
    setKwargs(null)
    setLogLevel(logLevels[3])
    setRedis(null)
    setName("")
  }

  const duplicate = cron => {
    setCommand(allCommands?.find(c => c.value === cron.command) || null)
    setExpression(cron.expression)
    setIsActive(cron.is_active)
    setKwargs(JSON.stringify(cron.kwargs, null, "\t"))
    setLogLevel(logLevels[cron.log_level])
    setName(cron.name)
    setRedis(JSON.stringify({}, null, "\t"))
  }

  const onCloseModal = useCallback(() => {
    dispatch(select())
    dispatch(setModalOpen(false))
    clearModal()
  }, [dispatch])
  const onCommandChange = useCallback(e => {
      const cmd = allCommands?.find(c => c.value === e.value)
      allCommands && setCommand({ label: cmd.label, value: e.value })
      if (!selectedItem) {
        const placeholders = {
          str: "<placeholder str>",
          bool: false,
          int: 0,
          float: 0.0,
          dict: {},
          list: [],
        }
        setName(cmd.label.split('.').reverse()[0].replaceAll('_', ' '));
        if (cmd.args) {
          const kw = cmd.args.reduce((result, item) => {
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
    },
    [allCommands, selectedItem]
  )
  const onDelete = useCallback(() => dispatch(api.delete(selectedItem.id, selectedItem.name)), [dispatch, selectedItem])
  const onExpressionChange = useCallback(e => setExpression(e.target.value), [])
  const onIsActiveChange = useCallback(() => {setIsActive(!isActive)}, [isActive])
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
  const onLogLevelChange = useCallback((e) => {
    setLogLevel(logLevels[e.value])}, []
  )
  const onNameChange = useCallback(e => setName(e.target.value), [])
  const onSubmit = useCallback(() => {
    const data = {
      command: command.value,
      expression,
      is_active: isActive,
      log_level: logLevel?.value,
      name
    }
    if (kwargs) data.kwargs = JSON.parse(kwargs.replace(/[\r\n\t]/g, ""))
    if (selectedItem) dispatch(api.update(selectedItem.id, data))
    else dispatch(api.create(data))
  }, [command, selectedItem, dispatch, expression, isActive, kwargs, logLevel, name])

  const hasChanges = () => {
    if (!selectedItem) return false
    return (
      command?.value !== selectedItem.command ||
      expression !== selectedItem.expression ||
      isActive !== selectedItem.is_active ||
      logLevel?.value !== selectedItem.log_level ||
      name !== selectedItem.name ||
      kwargs !== JSON.stringify(selectedItem.kwargs) ||
      JSON.stringify(JSON.parse(redis)) !== JSON.stringify(selectedItem.redis)
    )
  }

  useEffect(() => {!crons && dispatch(api.getList())}, []);

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Cron Jobs</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Home</a></li>
            <li className="breadcrumb-item active" aria-current="page">Crons</li>
          </ol>
        </nav>
      </div>
      <div className="row">
        <div className="col-lg-12 grid-margin stretch-card">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">
                Available crons
                <button
                    type="button"
                    className="btn btn-outline-success btn-sm border-0 bg-transparent"
                    onClick={() => dispatch(api.getList())}
                >
                  <i className="mdi mdi-refresh" />
                </button>
                <button
                    type="button"
                    className="float-right btn btn-outline-primary btn-rounded btn-icon pl-1"
                    onClick={() => dispatch(setModalOpen(true))}
                >
                  <i className="mdi mdi-plus" />
                </button>
              </h4>

              {!selectedItem && !modalOpen && <Errors errors={errors}/>}

              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th> # </th>
                      <th> Name </th>
                      <th> Expression </th>
                      <th> Is Active? </th>
                      <th> Log level </th>
                      <th> Last run </th>
                      <th> Status </th>
                      <th> Run </th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      !loading
                        ? crons?.length
                          ? crons.map(
                            (cron, i) => !loadingItems?.includes(cron.id)
                              ? <tr key={i}>
                                <td onClick={() => dispatch(select(cron.id))} className="cursor-pointer">{i + 1}</td>
                                <td onClick={() => dispatch(select(cron.id))} className="cursor-pointer">
                                  {cron.name}
                                </td>
                                <td onClick={() => dispatch(select(cron.id))} className="cursor-pointer">{cron.cron_description}</td>
                                <td onClick={() => dispatch(select(cron.id))} className="cursor-pointer">
                                  <i className={`mdi mdi-${cron.is_active ? 'check text-success' : 'alert text-danger'}`} />
                                </td>
                                <td
                                  className={
                                    `cursor-pointer text-${
                                      cron.log_level === DEBUG
                                        ? 'info'
                                        : cron.log_level === INFO
                                          ? 'primary'
                                          : cron.log_level === WARNING
                                            ? 'warning'
                                            : [CRITICAL, ERROR].includes(cron.log_level)
                                              ? 'danger'
                                              : 'secondary'
                                    }`
                                  }
                                  onClick={() => dispatch(select(cron.id))}
                                >
                                  {logLevels[cron.log_level].label}
                                </td>
                                <td onClick={() => dispatch(select(cron.id))} className="cursor-pointer">
                                  {
                                    cron.redis?.history?.[0]?.timestamp
                                      ? new Date(cron.redis.history[0].timestamp).toUTCString()
                                      : '-'
                                  }
                                </td>
                                <td
                                  className={
                                    `cursor-pointer text-${
                                      cron.redis.history?.[0]?.status === 'complete'
                                        ? 'success'
                                        : cron.redis.history?.[0]?.status === 'executing'
                                          ? 'warning' : 'danger'
                                    }`
                                  }
                                  onClick={() => dispatch(select(cron.id))}
                                >
                                  {cron.redis.history?.[0]?.status ? capitalize(cron.redis.history[0].status) : '-'}
                                </td>
                                <td>
                                  <i
                                    onClick={() => {duplicate(cron);dispatch(setModalOpen(true))}}
                                    className="cursor-pointer mdi mdi-content-copy"
                                  />
                                  <div className="btn-group btn-group-sm" role="group">
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary border-0"
                                      onClick={() => {
                                        setSelectedAction('run');
                                        setSelectedActionCron(cron);
                                      }}
                                    >
                                      <i className="mdi mdi-play" />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger border-0"
                                      onClick={() => {
                                        setSelectedAction('kill');
                                        setSelectedActionCron(cron);
                                      }}
                                    >
                                      <i className="mdi mdi-skull-crossbones" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              : <tr key={i}>
                                <td colSpan={6}>
                                  <ColorRing
                                    width="100%"
                                    height="50"
                                    wrapperStyle={{ width: '100%' }}
                                  />
                                </td>
                              </tr>
                          )
                          : <tr>
                            <td colSpan={7}>No crons available</td>
                          </tr>
                        : <tr>
                          <td colSpan={8}>
                            <Audio width="100%" radius="9" color="green" wrapperStyle={{width: "100%"}} />
                          </td>
                        </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal centered show={Boolean(selectedAction)} onHide={() => setSelectedAction("")}>
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="row">
              <div className="col-lg-12 grid-margin stretch-card">
                Are you sure you want to {selectedAction} "{selectedActionCron?.command}"?
              </div>
            </div>
            <p className="text-muted mb-0">This may take a few moments, please be patient</p>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>This will run <b>{selectedActionCron?.command}</b></Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={e => {
            e.preventDefault()
            setSelectedAction("")
          }}>Close</Button>
          <Button variant={selectedAction === "run" ? "primary" : "danger"} className="float-left" onClick={evt => {
            evt.preventDefault()
            if (["kill", "run"].includes(selectedAction))
              dispatch(CronsApi[selectedAction](token, selectedActionCron?.id, selectedActionCron?.command))
            setSelectedAction("")
          }}>Yes, {selectedAction} it!
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal centered show={Boolean(selectedItem) || modalOpen} onHide={onCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            <div className="row">
              <div className="col-lg-12 grid-margin stretch-card">
                {selectedItem ? 'Edit' : 'Add new cron'} { selectedItem?.name }
                {
                  selectedItem
                    ? <button
                        type="button"
                        className="btn btn-outline-success btn-sm border-0 bg-transparent"
                        onClick={() => dispatch(api.getItem(selectedItem.id))}>
                        <i className="mdi mdi-refresh" />
                      </button>
                    : null
                }
              </div>
            </div>
            {selectedItem && <p className="text-muted mb-0">{selectedItem?.description}</p>}
            {
              command
                ? allCommands?.find(c => c.value === command.value)?.args?.length
                  ? <p className="text-muted mb-0">
                      Params:
                      <ul>
                        {allCommands.find(c => c.value === command.value)?.args.map(arg =>
                          <li>
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
                : null
            }
          </Modal.Title>
        </Modal.Header>
        {
          loadingItems?.includes(selectedItem?.id)
            ? <ColorRing
              width = "100%"
              height = "50"
              wrapperStyle={{width: "100%"}}
            />
          : <Modal.Body>
          <Form onSubmit={onSubmit}>
            <Errors errors={errors}/>
            <Form.Group className="mb-3">
              <Form.Label>Management Command</Form.Label>
              <Select
                isDisabled={commands.loading}
                isLoading={commands.loading}
                onChange={onCommandChange}
                options={allCommands}
                styles={selectStyles}
                value={command}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control type="text" value={name} onChange={onNameChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Is Active?</Form.Label>
              <Form.Check checked={isActive} type="switch" id="checkbox" label="" onChange={onIsActiveChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Log level</Form.Label>
              <Select
                isDisabled={commands.loading}
                isLoading={commands.loading}
                onChange={onLogLevelChange}
                options={Object.values(logLevels)}
                styles={selectStyles}
                value={logLevel}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Expression</Form.Label>
              <Form.Control
                type="text"
                value={expression}
                onChange={onExpressionChange}
                required
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
            <Form.Group className="mb-3">
              <Form.Label>Redis</Form.Label>
              <AceEditor
                placeholder="Redis"
                mode="python"
                readOnly
                theme="monokai"
                fontSize={12}
                showPrintMargin
                showGutter={false}
                highlightActiveLine
                value={redis}
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
            selectedItem && <Button variant="danger" className="float-left" onClick={onDelete}>
              Delete
            </Button>
          }
          <Button variant="secondary" onClick={onCloseModal}>Close</Button>
          <Button variant="primary" onClick={onSubmit} disabled={!name || !command || !expression}>Save Changes</Button>
          <Button
            disabled={hasChanges()}
            variant="success"
            onClick={evt => {
              evt.preventDefault()
              dispatch(CronsApi.run(token, selectedItem?.id, selectedItem?.command))
              }
          }
          >
            Run
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Crons;

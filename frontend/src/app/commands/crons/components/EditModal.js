import React, {useCallback, useEffect, useState} from "react";
import { useDispatch, useSelector } from "react-redux";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import 'ace-builds'
import 'ace-builds/webpack-resolver'
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import AceEditor from "react-ace";
import Select from 'react-select';
import { ColorRing } from "react-loader-spinner";


import CommandsApi from '../../../../api/commands';
import CronsApi from "../../../../api/crons";
import Errors from "../../../shared/Errors";
import { select, setModalOpen } from "../../../../redux/cronsSlice";
import { selectStyles } from '../../../finances/Accounts/Categorize/EditModal';
import { logLevels } from '../Crons';


const EditModal = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const commands = useSelector(state => state.commands)
  const { selectedCron: cron, loadingItems, errors, modalOpen } = useSelector(state => state.crons)

  const api = new CronsApi(token)

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
    if (cron) {
      setCommand(allCommands?.find(c => c.value === cron.command) || null)
      setExpression(cron.expression)
      setIsActive(cron.is_active)
      setKwargs(JSON.stringify(cron.kwargs, null, "\t"))
      setLogLevel(logLevels[cron.log_level])
      setRedis(JSON.stringify(cron.redis, null, "\t"))
      setName(cron.name)
    }
    if (!commands.results) dispatch(new CommandsApi(token).getList())
  }, [allCommands, commands.results, cron, dispatch, token]);

  const clearModal = () => {
    setCommand(null)
    setExpression("")
    setIsActive(false)
    setKwargs(null)
    setLogLevel(logLevels[3])
    setRedis(null)
    setName("")
  }

  const onCloseModal = useCallback(() => {
    dispatch(select())
    dispatch(setModalOpen(false))
    clearModal()
  }, [dispatch])
  const onCommandChange = useCallback(e => {
      const cmd = allCommands?.find(c => c.value === e.value)
      allCommands && setCommand({ label: cmd.label, value: e.value })
      if (!cron) {
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
    [allCommands, cron]
  )
  const onDelete = useCallback(() => dispatch(api.delete(cron.id, cron.name)), [dispatch, cron])
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
      log_level: logLevel.value,
      name
    }
    if (kwargs) data.kwargs = JSON.parse(kwargs.replace(/[\r\n\t]/g, ""))
    if (cron) dispatch(api.update(cron.id, data))
    else dispatch(api.create(data))
  }, [command, cron, dispatch, expression, isActive, kwargs, logLevel, name])

  const hasChanges = () => {
    if (!cron) return false
    return (
      command?.value !== cron.command ||
      expression !== cron.expression ||
      isActive !== cron.is_active ||
      logLevel?.value !== cron.log_level ||
      name !== cron.name ||
      kwargs !== JSON.stringify(cron.kwargs) ||
      JSON.stringify(JSON.parse(redis)) !== JSON.stringify(cron.redis)
    )
  }

  return <Modal centered show={Boolean(cron) || modalOpen} onHide={onCloseModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card">
            {cron ? 'Edit' : 'Add new cron'} { cron?.name }
            {
              cron
                ? <button
                    type="button"
                    className="btn btn-outline-success btn-sm border-0 bg-transparent"
                    onClick={() => dispatch(api.getItem(cron.id))}>
                    <i className="mdi mdi-refresh" />
                  </button>
                : null
            }
          </div>
        </div>
        {cron && <p className="text-muted mb-0">{cron?.description}</p>}
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
      loadingItems?.includes(cron?.id)
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
        cron && <Button variant="danger" className="float-left" onClick={onDelete}>
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
          dispatch(CronsApi.run(token, cron?.id, cron?.command))
          }
      }
      >
        Run
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;

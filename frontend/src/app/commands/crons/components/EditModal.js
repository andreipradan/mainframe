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

const EditModal = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const commands = useSelector(state => state.commands)
  const { selectedCron: cron, loadingCrons, errors, modalOpen } = useSelector(state => state.crons)

  const [annotations, setAnnotations] = useState(null);
  const [args, setArgs] = useState("");
  const [allCommands, setAllCommands] = useState(null)
  const [command, setCommand] = useState(null);
  const [expression, setExpression] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [kwargs, setKwargs] = useState(null);
  const [redis, setRedis] = useState(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (commands.results) {
      const allCommands = []
      for (const app of commands.results) {
        for (const cmd of app.commands)
          allCommands.push({ label: `${app.app}.${cmd.name}`, value: cmd.name})
      }
      setAllCommands(allCommands)
    }
  }, [commands.results]);
  useEffect(() => {
    if (cron) {
      setArgs(cron.args?.length ? cron.args.join("\n") : "")
      setCommand(allCommands.find(c => c.value === cron.command) || null)
      setExpression(cron.expression)
      setIsActive(cron.is_active)
      setKwargs(JSON.stringify(cron.kwargs, null, "\t"))
      setRedis(JSON.stringify(cron.redis, null, "\t"))
      setName(cron.name)
    }
    if (!commands.results) dispatch(CommandsApi.getList(token))
  }, [allCommands, commands.results, cron, dispatch, token]);

  const clearModal = () => {
    setArgs("")
    setCommand(null)
    setExpression("")
    setIsActive(false)
    setKwargs(null)
    setRedis(null)
    setName("")
  }

  const onArgsChange = useCallback(e => setArgs(e.target.value), [])
  const onCloseModal = useCallback(() => {
    dispatch(select())
    dispatch(setModalOpen(false))
    clearModal()
  }, [dispatch])
  const onCommandChange = useCallback(e =>
    allCommands && setCommand({ label: allCommands.find(c => c.value === e.value).label, value: e.value }),
    [allCommands]
  )
  const onDelete = useCallback(() => dispatch(CronsApi.delete(token, cron.id)), [dispatch, token, cron])
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
  const onNameChange = useCallback(e => setName(e.target.value), [])
  const onSubmit = useCallback(() => {
    const data = {
      command: command.value,
      expression,
      is_active: isActive,
      name
    }
    if (args) data.args = args.split("\n")
    if (kwargs) data.kwargs = JSON.parse(kwargs.replace(/[\r\n\t]/g, ""))
    if (cron) dispatch(CronsApi.updateCron(token, cron.id, data))
    else dispatch(CronsApi.create(token, data))
    clearModal()
  }, [args, command, cron, dispatch, expression, isActive, kwargs, name, token])

  return <Modal centered show={Boolean(cron) || modalOpen} onHide={onCloseModal}>
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
      <Form onSubmit={onSubmit}>
        <Errors errors={errors}/>
        <Form.Group className="mb-3">
          <Form.Label>Name</Form.Label>
          <Form.Control type="text" value={name} onChange={onNameChange} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Is Active?</Form.Label>
          <Form.Check checked={isActive} type="switch" id="checkbox" label="" onChange={onIsActiveChange} />
        </Form.Group>
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
          <Form.Label>Expression</Form.Label>
          <Form.Control
            type="text"
            value={expression}
            onChange={onExpressionChange}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Args</Form.Label>
          <Form.Control as="textarea" rows={3} value={args || ""} placeholder={"args"} onChange={onArgsChange} />
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
      <Button variant="primary" onClick={onSubmit}>Save Changes</Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;

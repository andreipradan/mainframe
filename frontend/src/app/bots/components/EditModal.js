import React, {useEffect, useState} from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import {select} from "../../../redux/botsSlice";
import BotsApi from "../../../api/bots";
import 'ace-builds'
import 'ace-builds/webpack-resolver'
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import {ColorRing} from "react-loader-spinner";

const EditModal = () => {
  const dispatch = useDispatch();
  const bot = useSelector(state => state.bots.selectedBot)
  const token = useSelector((state) => state.auth.token)
  const loadingBots = useSelector(state => state.bots.loadingBots)

  const [isActive, setIsActive] = useState(bot?.is_active || false);
  const [webhook, setWebhook] = useState("");
  const [webhookName, setWebhookName] = useState("");
  const [whitelist, setWhitelist] = useState(null);
  const [additionalData, setAdditionalData] = useState(null);
  const [annotations, setAnnotations] = useState(null);

  useEffect(() => {
    if (bot) {
      setIsActive(bot.is_active)
      setWebhook(bot.webhook || "")
      setWebhookName(bot.webhook_name || "")
      setWhitelist(bot.whitelist.join("\n") || "")
      setAdditionalData(JSON.stringify(bot.additional_data, null, "\t"))
    }
  }, [bot]);

  const onAdditionalDataChange = (e, i) => {
    setAdditionalData(e)
    try {
      JSON.parse(e)
      setAnnotations(null)
    }
    catch (error) {
      const annotation = {...i.end, text: error.message, type: 'error'}
      setAnnotations(!annotations ? [annotation] : [...annotations, annotation])
    }
  }
  return <Modal centered show={!!bot} onHide={() => dispatch(select())}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card">
            Edit {bot?.full_name}
            <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(BotsApi.getItem(token, bot?.id))}>
              <i className="mdi mdi-refresh"></i>
            </button>
          </div>
        </div>
        <p className="text-muted mb-0">{bot?.token}</p>
      </Modal.Title>
    </Modal.Header>
    {
      loadingBots?.includes(bot?.id)
      ? <ColorRing
          width = "100%"
          height = "50"
          wrapperStyle={{width: "100%"}}
        />
      : <Modal.Body>
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Webhook</Form.Label>
          <Form.Control
            type="text"
            autoFocus
            value={webhook}
            onChange={e => setWebhook(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Webhook Name</Form.Label>
          <Form.Control
            type="text"
            autoFocus
            value={webhookName}
            onChange={e => setWebhookName(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="custom-switch"
            label="Is Active"
            checked={isActive}
            onChange={() => {setIsActive(!isActive)}}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Whitelist</Form.Label>
          <Form.Control as="textarea" rows={3} value={whitelist || ""} onChange={e => setWhitelist(e.target.value)}/>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Additional Data</Form.Label>
          <AceEditor
            className={!!annotations ? "form-control is-invalid" : ""}
            annotations={annotations}
            placeholder="Additional Data"
            mode="python"
            theme="monokai"
            onChange={onAdditionalDataChange}
            fontSize={12}
            showPrintMargin={true}
            showGutter={true}
            highlightActiveLine={true}
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
      <Button variant="secondary" onClick={() => dispatch(select())}>
        Close
      </Button>
      <Button variant="primary" disabled={!!annotations} onClick={() => {
        dispatch(BotsApi.updateBot(token, bot.id, {
          additional_data: JSON.parse(additionalData.replace(/[\r\n\t]/g, "")),
          is_active: isActive,
          webhook: webhook,
          webhook_name: webhookName,
          whitelist: whitelist ? whitelist.split("\n") : [],
        }))
      }}>
        Save Changes
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;
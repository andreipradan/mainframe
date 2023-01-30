import React, {useEffect, useState} from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import {select} from "../../../redux/botsSlice";
import BotsApi from "../../../api/bots";


const EditModal = () => {
  const dispatch = useDispatch();
  const bot = useSelector(state => state.bots.selectedBot)
  const token = useSelector((state) => state.auth.token)

  const [isExternal, setIsExternal] = useState(bot?.is_external || false);
  const [webhook, setWebhook] = useState("");
  const [webhookName, setWebhookName] = useState("");
  const [whitelist, setWhitelist] = useState(null);

  useEffect(() => {
    if (bot) {
      setIsExternal(bot.is_external)
      setWebhook(bot.webhook || "")
      setWebhookName(bot.webhook_name || "")
      setWhitelist(bot.whitelist.join("\n") || "")
    }
  }, [bot]);

  return <Modal centered show={!!bot} onHide={() => dispatch(select())}>
    <Modal.Header closeButton><Modal.Title>Edit {bot?.full_name}</Modal.Title></Modal.Header>
    <Modal.Body>
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
            label="Is External"
            checked={isExternal}
            onChange={() => {setIsExternal(!isExternal)}}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Whitelist</Form.Label>
          <Form.Control as="textarea" rows={3} value={whitelist || ""} onChange={e => setWhitelist(e.target.value)}/>
        </Form.Group>
      </Form>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={() => dispatch(select())}>
        Close
      </Button>
      <Button variant="primary" onClick={() => {
        dispatch(BotsApi.updateBot(token, bot.id, {
          is_external: isExternal,
          webhook: webhook,
          webhook_name: webhookName,
          whitelist: whitelist.split("\n"),
        }))
        dispatch(select())
      }}>
        Save Changes
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;
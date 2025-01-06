import React, { useCallback, useState } from 'react';
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import { selectItem as select, setModalOpen } from '../../../redux/botsSlice';
import BotsApi from "../../../api/bots";
import 'ace-builds'
import 'ace-builds/webpack-resolver'

import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import {ColorRing} from "react-loader-spinner";

const AddModal = () => {
  const dispatch = useDispatch();
  const { loadingItems: loadingBots, modalOpen, selectedItem: bot } = useSelector(state => state.bots)
  const token = useSelector((state) => state.auth.token)

  const api = new BotsApi(token)

  const [telegramToken, setTelegramToken] = useState("");

  const onCloseModal = useCallback(() => {
    dispatch(setModalOpen(false))
    setTelegramToken("")
  }, [dispatch])
  const onSave = () => {
    onCloseModal()
    dispatch(api.create({token: telegramToken}))
  }
  return <Modal centered show={Boolean(bot) || modalOpen} onHide={() => dispatch(onCloseModal)}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card">Add new bot</div>
        </div>
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
          <Form.Label>Token</Form.Label>
          <Form.Control
            type="text"
            value={telegramToken}
            onChange={e => setTelegramToken(e.target.value)}
          />
        </Form.Group>      </Form>
    </Modal.Body>
    }
    <Modal.Footer>
      <Button variant="secondary" onClick={() => dispatch(select())}>
        Close
      </Button>
      <Button variant="primary" disabled={!telegramToken} onClick={onSave}>
        Save Changes
      </Button>
    </Modal.Footer>
  </Modal>
}
export default AddModal;
import React from "react";
import { ColorRing } from "react-loader-spinner";
import { useDispatch, useSelector } from "react-redux";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

import 'ace-builds'
import 'ace-builds/webpack-resolver'
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";


import { selectItem } from "../../../redux/messagesSlice";

const EditModal = () => {
  const dispatch = useDispatch();
  const { selectedItem: msg, loadingItems } = useSelector(state => state.messages)

  return <Modal centered show={!!msg} onHide={() => dispatch(selectItem())}>
    <Modal.Header closeButton>
      <Modal.Title>
        Edit&nbsp;<i>{ msg?.chat_title }</i>
        <p className="text-muted mb-0">by {msg?.author.full_name}</p>
        {
          msg && <>
            <p className="text-muted mb-0">{new Date(msg.date).toLocaleString()}</p>
          </>
        }
      </Modal.Title>
    </Modal.Header>
    {
      loadingItems?.includes(msg?.id)
      ? <ColorRing
          width = "100%"
          height = "50"
          wrapperStyle={{width: "100%"}}
        />
      : <Modal.Body>
          <p className="text-muted mb-0">Chat ID: {msg.chat_id}</p>
          <p className="text-muted mb-0">Message ID: {msg.message_id}</p>
          <p className="text-muted mb-0">Saved by: {msg.saved_by.first_name}</p>
          <hr />
          {msg.text.split("\n").map((line, i) => <p key={i} className="text-muted mb-0">{line}</p>)}
        </Modal.Body>
    }
    <Modal.Footer>
      <Button variant="secondary" onClick={selectItem}>Close</Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;

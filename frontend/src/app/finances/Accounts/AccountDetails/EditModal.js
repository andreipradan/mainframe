import React, {useEffect, useState} from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import 'ace-builds'
import 'ace-builds/webpack-resolver'

import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import { selectTransaction } from "../../../../redux/transactionsSlice";
import Alert from "react-bootstrap/Alert";
import AceEditor from "react-ace";
import Form from "react-bootstrap/Form";

const EditModal = () => {
  const dispatch = useDispatch();
  const transactions = useSelector(state => state.transactions)

  const [alertOpen, setAlertOpen] = useState(false)
  useEffect(() => {setAlertOpen(!!transactions.errors)}, [transactions.errors])

  const closeModal = () => {
    dispatch(selectTransaction())
  }

  return <Modal centered show={!!transactions.selectedTransaction} onHide={closeModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card mb-1">Transaction details</div>
        </div>
        <p className="text-muted mb-0">{transactions.selectedAccount?.started_at}</p>
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {
        alertOpen && <div className="col-sm-12 grid-margin"><Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>
          {transactions.errors}
        </Alert></div>
      }
      {
        transactions.selectedTransaction && <Form onSubmit={e => e.preventDefault()}>
          <Form.Group className="mb-3">
            <Form.Label>Started</Form.Label>
            <Form.Control
              readOnly={true}
              className="bg-transparent text-muted"
              type="text"
              autoFocus
              value={new Date(transactions.selectedTransaction.started_at).toLocaleDateString()}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Completed</Form.Label>
            <Form.Control
              readOnly={true}
              className="bg-transparent text-muted"
              type="text"
              autoFocus
              value={new Date(transactions.selectedTransaction.completed_at).toLocaleDateString()}
            />
          </Form.Group>
          {
            ["amount", "fee", "state", "type", "product"].map((item, i) =>
              <Form.Group className="mb-3" key={i}>
                  <Form.Label>{item[0].toUpperCase() + item.slice(1, item.length)}</Form.Label>
                  <Form.Control
                    readOnly={true}
                    className="bg-transparent text-muted"
                    type="text"
                    autoFocus
                    value={transactions.selectedTransaction[item]}
                  />
                </Form.Group>
            )
          }
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              readOnly={true}
              className="bg-transparent text-muted"
              type="text"
              autoFocus
              value={transactions.selectedTransaction.description}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Additional data</Form.Label>
            {
              transactions.selectedTransaction.additional_data
                ? <AceEditor
                    placeholder="Additional Data"
                    mode="python"
                    theme="monokai"
                    readOnly={true}
                    fontSize={12}
                    showGutter={false}
                    value={JSON.stringify(transactions.selectedTransaction?.additional_data, null, "\t")}
                    width="100%"
                    height="150px"
                  />
                : "-"
            }
          </Form.Group>
        </Form>
      }
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={closeModal}>Close</Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;
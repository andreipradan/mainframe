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
import {Dropdown} from "react-bootstrap";
import FinanceApi from "../../../../api/finance";

const EditModal = () => {
  const token = useSelector((state) => state.auth.token)
  const dispatch = useDispatch();
  const {categories, transaction_types: TYPES} = useSelector(state => state.accounts.analytics)
  const transactions = useSelector(state => state.transactions)

  const closeModal = () => dispatch(selectTransaction())
  const [alertOpen, setAlertOpen] = useState(false)
  const [category, setCategory] = useState("")
  const [type, setType] = useState("")
  useEffect(() => {setAlertOpen(!!transactions.errors)}, [transactions.errors])
  useEffect(() => {
    setCategory(transactions.selectedTransaction?.category)
    setType(transactions.selectedTransaction?.type)
    },
    [transactions.selectedTransaction]
  )


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
        transactions.selectedTransaction &&
        <Form onSubmit={e => {
          e.preventDefault()
          dispatch(FinanceApi.updateTransaction(
            token, transactions.selectedTransaction.id, {type, category}
          ))
        }}>
          <Form.Group>
            <Form.Label>Category</Form.Label>&nbsp;
            <Dropdown className="btn btn-outline-primary btn-sm float-right">
              <Dropdown.Toggle as="a" className="cursor-pointer">{category}</Dropdown.Toggle>
              <Dropdown.Menu>
                {
                  categories?.map((cat, i) =>
                    <Dropdown.Item key={i} href="!#" onClick={evt => {
                      evt.preventDefault()
                      setCategory(cat)
                    }} className="preview-item">
                      <div className="preview-item-content">
                        <p className="preview-subject mb-1">{cat}</p>
                      </div>
                    </Dropdown.Item>
                  )
                }
              </Dropdown.Menu>
            </Dropdown>
          </Form.Group>
          <Form.Group>
            <Form.Label>Type</Form.Label>&nbsp;
            <Dropdown className="btn btn-outline-primary btn-sm float-right">
              <Dropdown.Toggle as="a" className="cursor-pointer">{type}</Dropdown.Toggle>
              <Dropdown.Menu>
                {
                  TYPES?.map((acc, i) =>
                    <Dropdown.Item key={i} href="!#" onClick={evt => {
                      evt.preventDefault()
                      setType(acc)
                    }} className="preview-item">
                      <div className="preview-item-content">
                        <p className="preview-subject mb-1">{acc}</p>
                      </div>
                    </Dropdown.Item>
                  )
                }
              </Dropdown.Menu>
            </Dropdown>
          </Form.Group>
          {
            ["amount", "currency", "fee", "state", "product"].map((item, i) =>
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
      <Button
        disabled={
          type === transactions.selectedTransaction?.type &&
          category === transactions.selectedTransaction?.category
      }
        variant="primary"
        onClick={() => {
          dispatch(FinanceApi.updateTransaction(token, transactions.selectedTransaction.id, {category, type}))
          dispatch(selectTransaction())
        }}
      >
        Save Changes
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;
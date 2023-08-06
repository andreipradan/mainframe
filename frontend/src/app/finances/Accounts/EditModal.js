import React, {useEffect, useState} from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import 'ace-builds'
import 'ace-builds/webpack-resolver'

import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import { ColorRing } from "react-loader-spinner";
import { selectAccount } from "../../../redux/accountsSlice";
import FinanceApi from "../../../api/finance";
import Alert from "react-bootstrap/Alert";
import Form from "react-bootstrap/Form";
import { setModalOpen } from "../../../redux/accountsSlice";

const EditModal = () => {
  const dispatch = useDispatch();
  const accounts = useSelector(state => state.accounts)
  const token = useSelector((state) => state.auth.token)

  const [alertOpen, setAlertOpen] = useState(false)
  useEffect(() => {setAlertOpen(!!accounts.errors)}, [accounts.errors])

  const [bank, setBank] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [number, setNumber] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    if (accounts.selectedAccount) {
      setBank(accounts.selectedAccount.bank || "")
      setClientCode(accounts.selectedAccount.client_code || "")
      setFirstName(accounts.selectedAccount.first_name || "")
      setLastName(accounts.selectedAccount.last_name || "")
      setNumber(accounts.selectedAccount.number || "")
      setType(accounts.selectedAccount.type || "")
    }
  }, [accounts.selectedAccount]);

  const submitForm = event => {
    event.preventDefault()
    const data = {
      bank: bank,
      client_code: clientCode,
      first_name: firstName,
      last_name: lastName,
      number: number,
      type: type,
    }
    if (accounts.selectedAccount)
      dispatch(FinanceApi.updateAccount(token, accounts.selectedAccount.id, data))
    else
      dispatch(FinanceApi.createAccount(token, data))
  }

  const clearModal = () => {
    setBank("")
    setClientCode("")
    setFirstName("")
    setLastName("")
    setNumber("")
    setType("")
  }

  const closeModal = () => {
    dispatch(selectAccount())
    dispatch(setModalOpen(false))
    clearModal()
  }

  return <Modal centered show={!!accounts.selectedAccount || accounts.modalOpen} onHide={closeModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card mb-1">
            {
              accounts.selectedAccount
                ? `Edit account #${accounts.selectedAccount.number}?`
                : 'Add a new account?'
            }
            {
              accounts.selectedAccount &&
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(FinanceApi.getAccount(token, accounts.selectedAccount?.id))}>
                <i className="mdi mdi-refresh"></i>
              </button>
            }
          </div>
        </div>
        <p className="text-muted mb-0">{accounts.selectedAccount?.date}</p>
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {
        alertOpen && accounts.modalOpen && <div className="col-sm-12 grid-margin"><Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>
          {
            accounts.errors?.length || accounts.errors?.success === "False"
              ? accounts.errors?.msg
                ? <p className="text-danger">{accounts.errors.msg}</p>
                : accounts.errors?.length
                  ? <ul className="text-danger">{accounts.errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
                  : null
              : "Sign in to continue."
          }
        </Alert></div>
      }
      {
        accounts.loadingAccounts?.includes(accounts.selectedAccount?.id)
        ? <ColorRing
            width = "100%"
            height = "50"
            wrapperStyle={{width: "100%"}}
          />
        : <Form
            onSubmit={submitForm}
          >
            <Form.Group className="mb-3" onSubmit={submitForm}>
              <Form.Label>Bank</Form.Label>
              <Form.Control
                type="text"
                autoFocus
                value={bank}
                onChange={e => setBank(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Client code</Form.Label>
              <Form.Control
                type="text"
                autoFocus
                value={clientCode}
                onChange={e => setClientCode(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>First name</Form.Label>
              <Form.Control
                type="text"
                autoFocus
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Last name</Form.Label>
              <Form.Control
                type="text"
                autoFocus
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Number</Form.Label>
              <Form.Control
                type="text"
                autoFocus
                value={number}
                onChange={e => setNumber(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Control
                type="text"
                autoFocus
                value={type}
                onChange={e => setType(e.target.value)}
              />
            </Form.Group>
          </Form>
      }
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={closeModal}>Close</Button>
      <Button variant="primary" onClick={submitForm} >
        Update account
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;
import React, {useEffect, useState} from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { ColorRing } from "react-loader-spinner";
import { useDispatch, useSelector } from "react-redux";
import 'ace-builds'
import 'ace-builds/webpack-resolver'
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";

import { AccountsApi } from '../../../../../api/finance/accounts';
import { setModalOpen } from "../../../../../redux/accountsSlice";
import Errors from "../../../../shared/Errors";
import Form from "react-bootstrap/Form";

const AccountEditModal = () => {
  const dispatch = useDispatch();
  const accounts = useSelector(state => state.accounts)
  const token = useSelector((state) => state.auth.token)

  const [bank, setBank] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [currency, setCurrency] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [number, setNumber] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    if (accounts.modalOpen === "new") clearModal(); else populateModal()
  }, [accounts.modalOpen]);

  const submitForm = event => {
    event.preventDefault()
    const data = {
      bank: bank,
      client_code: clientCode,
      first_name: firstName,
      last_name: lastName,
      number: number,
      type: type,
      currency: currency,
    }
    if (accounts.modalOpen === "new")
      dispatch(AccountsApi.create(token, data, "new"))
    else
      dispatch(AccountsApi.update(token, accounts.selectedItem.id, data, true))
    dispatch(setModalOpen(false))
  }

  const clearModal = () => {
    setBank("")
    setClientCode("")
    setFirstName("")
    setLastName("")
    setNumber("")
    setType("")
    setCurrency("")
  }

  const closeModal = () => dispatch(setModalOpen(false))

  const populateModal = () => {
    if (accounts.selectedItem) {
      setBank(accounts.selectedItem.bank || "")
      setClientCode(accounts.selectedItem.client_code || "")
      setFirstName(accounts.selectedItem.first_name || "")
      setLastName(accounts.selectedItem.last_name || "")
      setNumber(accounts.selectedItem.number || "")
      setType(accounts.selectedItem.type || "")
      setCurrency(accounts.selectedItem.currency || "")
    }
  }

  return <Modal centered show={accounts.modalOpen} onHide={closeModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card mb-1">
            {
              accounts.modalOpen === "new"
                ? 'Add a new account?'
                : `Edit account #${accounts.selectedItem?.number}?`
            }
            {
              !(accounts.modalOpen === "new") &&
              <button
                type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={() => dispatch(AccountsApi.get(token, accounts.selectedItem?.id))}>
                <i className="mdi mdi-refresh"></i>
              </button>
            }
          </div>
        </div>
        <p className="text-muted mb-0">{accounts.selectedItem?.date}</p>
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Errors errors={accounts.errors}/>

      {
        accounts.loading
        ? <ColorRing
            width = "100%"
            height = "50"
            wrapperStyle={{width: "100%"}}
          />
        : <Form onSubmit={submitForm}>
            <Form.Group className="mb-3">
              <Form.Label>Bank</Form.Label>
              <Form.Control
                type="text"
                value={bank}
                onChange={e => setBank(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Client code</Form.Label>
              <Form.Control
                type="text"
                value={clientCode}
                onChange={e => setClientCode(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>First name</Form.Label>
              <Form.Control
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Last name</Form.Label>
              <Form.Control
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Number</Form.Label>
              <Form.Control
                type="text"
                value={number}
                onChange={e => setNumber(e.target.value)}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Control
                type="text"
                value={type}
                onChange={e => setType(e.target.value)}
              />
            </Form.Group>
            {
              accounts.modalOpen === "new" &&
              <Form.Group className="mb-3">
                <Form.Label>Currency</Form.Label>
                <Form.Control
                  type="text"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                />
              </Form.Group>

            }
          </Form>
      }
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={closeModal}>Close</Button>
      <Button variant="primary" onClick={submitForm} >
        {accounts.modalOpen === "new" ? "Add" : "Update"} account
      </Button>
    </Modal.Footer>
  </Modal>
}
export default AccountEditModal;
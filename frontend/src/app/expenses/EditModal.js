import React, {useEffect, useState} from "react";
import { useDispatch, useSelector } from "react-redux";
import { ColorRing } from "react-loader-spinner";
import Button from "react-bootstrap/Button";
import DatePicker from "react-datepicker";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import 'ace-builds'
import 'ace-builds/webpack-resolver'
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import "react-datepicker/dist/react-datepicker.css";

import { ExpensesApi } from "../../api/expenses";
import {selectItem, setModalOpen} from "../../redux/expensesSlice";
import {selectStyles} from "../finances/Accounts/Categorize/EditModal";
import Select from "react-select";

const EditModal = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)
  const user = useSelector((state) => state.auth.user)
  const expenses = useSelector(state => state.expenses)

  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("");
  const [date, setDate] = useState(new Date())
  const [description, setDescription] = useState("");
  const [payer, setPayer] = useState("");

  useEffect(() => {setPayer(user)}, []);
  useEffect(() => {
    if (expenses.selectedItem) {
      setAmount(expenses.selectedItem.amount || 0)
      setCurrency(expenses.selectedItem.currency || "")
      setDate(new Date(expenses.selectedItem.date || new Date()))
      setDescription(expenses.selectedItem.description || "")
      setPayer(expenses.selectedItem ? expenses.selectedItem.payer : user)
    }
    return clearModal
  }, [expenses.selectedItem]);

  const submitForm = event => {
    event.preventDefault()
    const data = {amount, currency, date: date.toISOString().split("T")[0], description, payer_id: payer.id}
    if (expenses.selectedItem) {
      dispatch(ExpensesApi.update(token, expenses.selectedItem.id, data))
    }
    else {
      dispatch(ExpensesApi.create(token, data))
    }
    clearModal()
  }

  const clearModal = () => {
    setAmount(0)
    setCurrency("")
    setDate(new Date())
    setDescription("")
    setPayer(user)
  }

  const closeModal = () => {
    dispatch(selectItem())
    dispatch(setModalOpen(false))
    clearModal()
  }

  const onChangePayer = newPayer => {
    setPayer(newPayer ? expenses.users.find(u => u.id === newPayer.value) : user)
  }

  return <Modal centered show={!!expenses.selectedItem || expenses.modalOpen} onHide={closeModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card mb-1">
            {expenses.selectedItem ? `Edit expense?` : 'Add expense?'}
            {
              expenses.selectedItem &&
              <button
                type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={() => dispatch(ExpensesApi.get(token, expenses.selectedItem?.id))}
              >
                <i className="mdi mdi-refresh" />
              </button>
            }
          </div>
        </div>
        <p className="text-muted mb-0">{expenses.selectedItem?.date}</p>
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <h6 className="font-weight-light">
        {
          expenses.errors?.length || expenses.errors?.detail
            ? expenses.errors?.detail
              ? <p className="text-danger">{expenses.errors.detail}</p>
              : expenses.errors?.length
                ? <ul className="text-danger">{expenses.errors.map((err, i) => <li key={i}>{err}</li>)}</ul>
                : null
            : null
        }
      </h6>
      {
        expenses.loadingItems?.includes(expenses.selectedItem?.id)
        ? <ColorRing
            width = "100%"
            height = "50"
            wrapperStyle={{width: "100%"}}
          />
        : <Form onSubmit={submitForm}>
            <Form.Group className="mb-3">
              <Form.Label>Payer</Form.Label>
              <Select
                placeholder={"Currency"}
                value={{label: `${payer.username} (${payer.email})`, value: payer.id}}
                onChange={onChangePayer}
                options={expenses.users?.map(u => ({label: `${u.username} (${u.email})`, value: u.id}))}
                styles={selectStyles}
                closeMenuOnSelect={true}
              />
            </Form.Group>
            <ul className="text-danger">
              {expenses.errors?.payer_id?.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <div>
                <DatePicker
                  className="btn btn-outline-secondary rounded btn-sm"
                  dateFormat={"dd-MM-yyyy"}
                  isClearable={false}
                  onChange={date => setDate(date)}
                  readOnly={expenses.loading}
                  scrollableYearDropdown={true}
                  selected={date}
                  showIcon
                  showYearDropdown={true}
                />
              </div>
            </Form.Group>
            <ul className="text-danger">
              {expenses.errors?.date?.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                isInvalid={expenses.errors?.description}
              />
            </Form.Group>
            <ul className="text-danger">
              {expenses.errors?.description?.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="text"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                isInvalid={expenses.errors?.amount}
              />
            </Form.Group>
            <ul className="text-danger">
              {expenses.errors?.amount?.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
            <Form.Group className="mb-3">
              <Form.Label>Currency</Form.Label>
              <Form.Control
                type="text"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                isInvalid={expenses.errors?.currency}
              />
            </Form.Group>
            <ul className="text-danger">
              {expenses.errors?.currency?.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
            <button type="submit" hidden />
          </Form>
      }
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={closeModal}>Close</Button>
      <Button variant={expenses.selectedItem ? 'warning' : 'success'} onClick={submitForm} type="submit">
        {expenses.selectedItem ? 'Update' : 'Create'} expense
      </Button>
    </Modal.Footer>
  </Modal>
}
export default EditModal;
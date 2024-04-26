import React, {useEffect, useState} from "react";
import { useDispatch, useSelector } from "react-redux";

import 'ace-builds'
import 'ace-builds/webpack-resolver'
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";

import AceEditor from "react-ace";
import Button from "react-bootstrap/Button";
import CreatableSelect from 'react-select/creatable';
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Select from "react-select";
import { Circles } from "react-loader-spinner";

import { FinanceApi } from "../../../../../api/finance";
import { capitalize } from "../AccountDetails";
import { createOption, selectStyles } from "../../../Categorize/EditModal";
import { selectItem as selectTransaction } from "../../../../../redux/transactionsSlice";
import Errors from "../../../../shared/Errors";

const TYPES = [
  "ATM",
  "CARD_CHARGEBACK",
  "CARD_CREDIT",
  "CARD_PAYMENT",
  "CARD_REFUND",
  "CASHBACK",
  "EXCHANGE",
  "FEE",
  "TOPUP",
  "TRANSFER",
  "UNIDENTIFIED",
]

const TransactionEditModal = () => {
  const token = useSelector((state) => state.auth.token)
  const dispatch = useDispatch();
  const categories = useSelector(state => state.categories)
  const transactions = useSelector(state => state.transactions)

  const closeModal = () => dispatch(selectTransaction())
  const [category, setCategory] = useState("")
  const [type, setType] = useState("")
  useEffect(() => {!categories.results && dispatch(FinanceApi.getCategories(token))}, [])
  useEffect(() => {
    setCategory(transactions.selectedItem?.category)
    setType(transactions.selectedItem?.type)
    },
    [transactions.selectedItem]
  )

  return <Modal centered show={!!transactions.selectedItem} onHide={closeModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card mb-1">
            Transaction details
            <button
              type="button"
              className="btn btn-outline-success btn-sm border-0 bg-transparent"
              onClick={() => {
                dispatch(FinanceApi.getCategories(token))
                dispatch(FinanceApi.getTransaction(token, transactions.selectedItem.id))
              }}
            >
              <i className="mdi mdi-refresh" />
            </button>
          </div>
        </div>
        <p className="text-muted mb-0">{transactions.selectedItem?.started_at}</p>
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Errors errors={transactions.errors}/>
      {
        !transactions.selectedItem ||
        transactions.loadingTransactions?.find(tId => tId === transactions.selectedItem.id)
          ? <Circles />
          : <Form onSubmit={e => {
            e.preventDefault()
            dispatch(FinanceApi.updateTransaction(
              token, transactions.selectedItem.id, {type, category}
            ))
          }}>
            <Form.Group>
              <Form.Label>Category</Form.Label>&nbsp;
              <CreatableSelect
                isClearable
                isDisabled={categories.loading}
                isLoading={categories.loading}
                options={categories.results?.map(c => createOption(c.id))}
                onChange={newValue => newValue.value ? setCategory(newValue.value) : ""}
                onCreateOption={id => {
                  dispatch(FinanceApi.updateTransaction(token, transactions.selectedItem.id, {category: id}))
                }}
                styles={selectStyles}
                value={createOption(category)}

              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Type</Form.Label>&nbsp;
              <Select
                isDisabled={categories.loading}
                isLoading={categories.loading}
                onChange={newValue => newValue.value ? setType(newValue.value) : ""}
                options={TYPES.map(t => createOption(t))}
                styles={selectStyles}
                value={createOption(type)}
              />
            </Form.Group>
            {
              ["amount", "currency", "fee", "state", "product"].map((item, i) =>
                <Form.Group className="mb-3" key={i}>
                    <Form.Label>{capitalize(item)}</Form.Label>
                    <Form.Control
                      readOnly={true}
                      className="bg-transparent text-muted"
                      type="text"
                      
                      value={transactions.selectedItem[item]}
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
                
                value={new Date(transactions.selectedItem.started_at).toLocaleDateString()}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Completed</Form.Label>
              <Form.Control
                readOnly={true}
                className="bg-transparent text-muted"
                type="text"
                
                value={new Date(transactions.selectedItem.completed_at).toLocaleDateString()}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                readOnly={true}
                className="bg-transparent text-muted"
                type="text"
                
                value={transactions.selectedItem.description}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Additional data</Form.Label>
              {
                transactions.selectedItem.additional_data
                  ? <AceEditor
                      placeholder="Additional Data"
                      mode="python"
                      theme="monokai"
                      readOnly={true}
                      fontSize={12}
                      showGutter={false}
                      value={JSON.stringify(transactions.selectedItem?.additional_data, null, "\t")}
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
          type === transactions.selectedItem?.type &&
          category === transactions.selectedItem?.category
      }
        variant="primary"
        onClick={() => {
          dispatch(FinanceApi.updateTransaction(token, transactions.selectedItem.id, {category, type}))
          dispatch(selectTransaction())
        }}
      >
        Save Changes
      </Button>
    </Modal.Footer>
  </Modal>
}
export default TransactionEditModal;
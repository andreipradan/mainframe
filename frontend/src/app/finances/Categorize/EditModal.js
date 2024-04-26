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

import ListItem from "../../shared/ListItem";
import { FinanceApi } from "../../../api/finance";
import { capitalize } from "../Accounts/AccountDetails/AccountDetails";
import { create as createCategory } from "../../../redux/categoriesSlice"
import { selectItem as selectTransaction } from "../../../redux/transactionsSlice";
import Errors from "../../shared/Errors";

export const createOption = label => ({label: getTypeLabel(label), value: label})

export const getTypeLabel = type =>
  type
    ? type === "ATM"
      ? type
      : `${capitalize(type).replace("_", " ")}`
    : ""

export const selectStyles = {
  control: (defaultStyles) => ({
    ...defaultStyles,
    borderColor: "#212529",
    backgroundColor: "transparent",
  }),
  option: (defaultStyles, state) => ({
    ...defaultStyles,
    backgroundColor: state.isSelected ? "#2f84d3" : state.isFocused ? "#829fbb": "#212529",
  }),
  singleValue: (styles, { data }) => ({ ...styles, color:"#ccc"}),
}

const EditModal = () => {
  const token = useSelector((state) => state.auth.token)
  const dispatch = useDispatch();
  const categories = useSelector(state => state.categories)
  const kwargs = useSelector(state => state.transactions.kwargs) || {}
  const transactions = useSelector(state => state.transactions)
  const transaction = transactions.selectedItem

  const closeModal = () => dispatch(selectTransaction())
  const [category, setCategory] = useState("")
  const [showSaveAllModal, setShowSaveAllModal] = useState(false)
  const [type, setType] = useState("")

  useEffect(() => {!categories.results && dispatch(FinanceApi.getCategories(token))}, [])
  useEffect(() => {
    setCategory(transaction?.category)
    setType(transaction?.type)
    },
    [transaction]
  )

  return transaction ? <Modal centered show={!!transaction} onHide={closeModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card mb-1">Transaction details</div>
        </div>
        <p className="text-muted mb-0">{transaction.description}</p>

        <ListItem
          label={"Amount"}
          value={`${transaction.amount} ${transaction.currency}${parseFloat(transaction.fee) ? ` (Fee: ${transaction.fee})` : ''}`}
          textType="danger"
        />
        <ListItem label={"Type"} value={getTypeLabel(transaction.type)} />
        <ListItem label={"Product"} value={transaction.product} />
        <ListItem label={"Started"} value={transaction.started_at} datetime={true}/>
        {
          transaction.state === "COMPLETED"
            ? <ListItem label={"Completed"} value={transaction.completed_at} datetime={true} />
            : <ListItem label={"State"} value={transaction.state} />
        }
        <ListItem
          label={"Confirmed by"}
          value={transactions.confirmedByChoices?.find(c => c[0] === transaction.confirmed_by)?.[1]}
          textType={
            transaction.confirmed_by === 1
              ? "warning"
              : transaction.confirmed_by === 2 ? "success" : "muted"
          }
        />
        <ListItem
          label={"Suggestion"}
          value={transaction.category_suggestion || "-"}
          textType={"warning"}
        />
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Errors errors={transactions.errors}/>

      <Form onSubmit={e => {
        e.preventDefault()
        dispatch(FinanceApi.updateTransaction(
          token, transaction.id, {type, category}
        ))
      }}>

        <Form.Group>
          <Form.Label>Category</Form.Label>&nbsp;
          <CreatableSelect
            isClearable
            isDisabled={categories.loading || transactions.loading}
            isLoading={categories.loading}
            options={categories.results?.map(c => createOption(c.id))}
            onChange={newValue => setCategory(newValue?.value ? newValue.value : "Unidentified")}
            onCreateOption={id => {
              dispatch(FinanceApi.updateTransaction(token, transaction.id, {category: id}))
              dispatch(createCategory({id: id, value: capitalize(id).replace("-", " ")}))
            }}
            styles={selectStyles}
            value={createOption(category)}
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Additional data</Form.Label>
          {
            transaction.additional_data
              ? <AceEditor
                  placeholder="Additional Data"
                  mode="python"
                  theme="monokai"
                  readOnly={true}
                  fontSize={12}
                  showGutter={false}
                  value={JSON.stringify(transaction.additional_data, null, "\t")}
                  width="100%"
                  height="150px"
                />
              : "-"
          }
        </Form.Group>
      </Form>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={closeModal}>Close</Button>
      <Button
        disabled={category === transaction.category}
        variant="danger"
        onClick={() => {setShowSaveAllModal(true)}}
      >
        Save all
      </Button>
      <Button
        disabled={
          type === transaction.type &&
          category === transaction.category
      }
        variant="primary"
        onClick={() => {
          dispatch(FinanceApi.updateTransaction(token, transaction.id, {category}))
          dispatch(selectTransaction())
        }}
      >
        Save Changes
      </Button>
    </Modal.Footer>
    <Modal centered show={showSaveAllModal} onHide={() => setShowSaveAllModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card mb-1">
              Update all transactions?
            </div>
          </div>
          <p className="text-muted mb-0">Update all transactions with this description</p>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        This will update <span className="text-danger mb-0">all the existing transactions</span> that have
        <ListItem label={"Description"} value={transaction.description} />
        to the new
        <ListItem label={"Category"} value={category} textType="warning" />
        Are you sure?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="success" onClick={() => setShowSaveAllModal(false)}>No, go back</Button>
        <Button
          variant="danger"
          onClick={() => {
            dispatch(FinanceApi.updateTransactions(token, {category, description: transaction.description}, kwargs))
            dispatch(selectTransaction())
            setShowSaveAllModal(false)
          }}
        >
          Yes, update ALL!
        </Button>
      </Modal.Footer>
    </Modal>
  </Modal>
    : null
}
export default EditModal;
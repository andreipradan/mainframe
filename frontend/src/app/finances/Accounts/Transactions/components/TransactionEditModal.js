import React, {useEffect, useState} from "react";
import { useDispatch, useSelector } from "react-redux";

import 'ace-builds'
import 'ace-builds/webpack-resolver'
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";

import { Circles } from "react-loader-spinner";
import AceEditor from "react-ace";
import Button from "react-bootstrap/Button";
import CreatableSelect from 'react-select/creatable';
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";

import Errors from "../../../../shared/Errors";
import { CategoriesApi } from '../../../../../api/finance/categories';
import { TransactionsApi } from '../../../../../api/finance/transactions';
import { capitalize } from "../../../../utils";
import { createOption, selectStyles } from "../../Categorize/EditModal";
import { selectItem as selectCategory } from "../../../../../redux/categoriesSlice";
import { selectItem as selectTransaction } from "../../../../../redux/transactionsSlice";

const TransactionEditModal = () => {
  const token = useSelector((state) => state.auth.token)
  const dispatch = useDispatch();
  const categories = useSelector(state => state.categories)
  const { errors, loadingItems, selectedItem } = useSelector(state => state.transactions)

  const [additionalData, setAdditionalData] = useState(null)
  const [additionalDataAnnotations, setAdditionalDataAnnotations] = useState(null)

  const closeModal = () => dispatch(selectTransaction())

  useEffect(() => {
    !categories.results && dispatch(CategoriesApi.getList(token))
  }, [])

  useEffect(() => {
    if(selectedItem) {
      dispatch(selectCategory(selectedItem.category))
      setAdditionalData(JSON.stringify(selectedItem.additional_data, null, "\t"));
    } else {
      setAdditionalData(null)
    }
  }, [selectedItem])

  const onAdditionalDataChange = (e, i) => {
    setAdditionalData(e)
    try {
      JSON.parse(e);
      setAdditionalDataAnnotations(null);
    }
    catch (error) {
      const annotation = {...i.end, text: error.message, type: 'error'}
      setAdditionalDataAnnotations(!additionalDataAnnotations ? [annotation] : [...additionalDataAnnotations, annotation])
    }
  }

  return <Modal centered show={!!selectedItem} onHide={closeModal}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card mb-1">
            Transaction details
            <button
              type="button"
              className="btn btn-outline-success btn-sm border-0 bg-transparent"
              onClick={() => {
                dispatch(CategoriesApi.getList(token))
                dispatch(TransactionsApi.get(token, selectedItem?.id))
              }}
            >
              <i className="mdi mdi-refresh" />
            </button>
          </div>
        </div>
        <p className="text-muted mb-0">
          Started at: {new Date(selectedItem?.started_at).toLocaleString()}<br/>
          Completed at: {new Date(selectedItem?.completed_at).toLocaleString()}
          <div className="mt-1">Amount: {selectedItem?.amount} {selectedItem?.currency} </div>
          {parseFloat(selectedItem?.fee) ? `Fee: ${selectedItem?.fee}` : null}
          {
            ["state", "product", "type"].map((item, i) =>
              <div key={i}>{capitalize(item)}: {capitalize(selectedItem?.[item] || " ")}</div>
            )
          }
        </p>
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Errors errors={errors}/>
      {
        categories.errors && <Errors errors={categories.errors}/>
      }
      {
        !selectedItem ||
        loadingItems?.find(tId => tId === selectedItem?.id)
          ? <Circles />
          : <Form>
            <Form.Group>
              <Form.Label>Category</Form.Label>&nbsp;
              <CreatableSelect
                isClearable
                isDisabled={categories.loading}
                isLoading={categories.loading}
                options={categories.results?.map(c => createOption(c.id))}
                onChange={newValue => dispatch(selectCategory(newValue?.value || "Unidentified"))}
                onCreateOption={id => dispatch(CategoriesApi.create(token, {id}))}
                styles={selectStyles}
                value={createOption(categories.selectedItem?.id)}

              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Additional data</Form.Label>
              {
                selectedItem?.additional_data
                  ? <AceEditor
                      annotations={additionalDataAnnotations}
                      className={(additionalDataAnnotations) ? "form-control is-invalid" : ""}
                      fontSize={12}
                      height="100px"
                      highlightActiveLine
                      mode="json"
                      onChange={onAdditionalDataChange}
                      placeholder="Additional Data"
                      setOptions={{
                        enableBasicAutocompletion: false,
                        enableLiveAutocompletion: false,
                        enableSnippets: false,
                        showLineNumbers: true,
                        tabSize: 2,
                        wrap: true
                      }}
                      showGutter={false}
                      showPrintMargin
                      theme="monokai"
                      value={additionalData}
                      width="100%"
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
        variant="primary"
        onClick={() => {
          dispatch(TransactionsApi.update(
            token,
            selectedItem?.id,
            {category: categories.selectedItem?.id, additional_data: JSON.parse(additionalData || "{}"), confirmed_by: 1},
            true,
          ))
        }}
      >
        Save Changes
      </Button>
    </Modal.Footer>
  </Modal>
}
export default TransactionEditModal;
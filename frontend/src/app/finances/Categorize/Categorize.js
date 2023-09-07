import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";

import Alert from "react-bootstrap/Alert";
import Form from "react-bootstrap/Form";
import Select from "react-select";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { Circles } from "react-loader-spinner";
import { Collapse } from "react-bootstrap";
import "nouislider/distribute/nouislider.css";
import "react-datepicker/dist/react-datepicker.css";

import EditModal, { getTypeLabel, selectStyles } from "./EditModal";
import FinanceApi from "../../../api/finance";
import { capitalize } from "../Accounts/AccountDetails/AccountDetails";
import {selectTransaction, setKwargs} from "../../../redux/transactionsSlice";

const Categorize = () => {
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token)
  const categories = useSelector(state => state.categories)
  const transactions = useSelector(state => state.transactions)
  const kwargs = useSelector(state => state.transactions.kwargs) || {}

  const [messageAlertOpen, setMessageAlertOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [allChecked, setAllChecked] = useState(false)
  const [checkedCategories, setCheckedCategories] = useState(null)
  const [predictModalOpen, setPredictModalOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [specificCategoriesModalOpen, setSpecificCategoriesModalOpen] = useState(false)
  const [trainModalOpen, setTrainModalOpen] = useState(false)
  const [transactionsAlertOpen, setTransactionsAlertOpen] = useState(false)

  const currentPage = !transactions.previous
    ? 1
    : (parseInt(new URL(transactions.previous).searchParams.get("page")) || 1) + 1

  const lastPage = Math.ceil(transactions.count / 25)
  const unpredictedCategories = transactions.results?.filter(t => !t.category_suggestion)?.map(t => t.description)

  const getSpecificCategory = description => checkedCategories?.find(c => c.description === description)?.category

  const onCategoryChange = newValue => {
    const newCategory = newValue ? newValue.value : ""
    dispatch(setKwargs({...(kwargs || {}), category: newCategory, page: 1}))
    dispatch(FinanceApi.getTransactions(token, {...kwargs, category: newCategory, page: 1}))
  }

  const onCheckedCategoryChange = (newValue, description) => {
    if (!newValue.value) return
    const newCategory = {description: description, category: newValue.value}
    setCheckedCategories(
      !checkedCategories?.length
        ? newCategory.category !== "Unidentified" ? [newCategory] : null
        : checkedCategories.find(c => c.description === description)
          ? newCategory.category !== "Unidentified"
            ? checkedCategories.map(c =>
              c.description === description
                ? {...c, category: newValue.value}
                : c)
            : checkedCategories.filter(c => c.description !== description)
          : newCategory.category !== "Unidentified"
            ? [...checkedCategories, newCategory]
            : checkedCategories
    )
  }
  const onTypeChange = newValue => {
    const newTypes = newValue.map(v => v.value)
    dispatch(setKwargs({...(kwargs || {}), type: newTypes, page: 1}))
    !newValue.length && dispatch(FinanceApi.getTransactions(token, {...kwargs, type: newTypes, page: 1}))
  }
  const onConfirmedByChange = newValue => {
    const newConfirmedBy = !newValue ? 0 : newValue.value
    dispatch(setKwargs({...(kwargs || {}), confirmed_by: newConfirmedBy, page: 1}))
    dispatch(FinanceApi.getTransactions(token, {...kwargs, confirmed_by: newConfirmedBy, page: 1}))
  }

  useEffect(() => {setMessageAlertOpen(!!transactions.msg)}, [transactions.msg])
  useEffect(() => {setTransactionsAlertOpen(!!transactions.errors)}, [transactions.errors])
  useEffect(() => {!transactions.results && dispatch(setKwargs({...kwargs, type: null}))}, [])
  useEffect(() => {
    !allChecked
      ? setCheckedCategories(null)
      : setCheckedCategories(transactions.results?.filter(
        t=> !!t.category_suggestion
      ).map(t => ({
        description: t.description, category: t.category_suggestion
      })))
  }, [allChecked])
  useEffect(() => {
    if(!transactions.loading) {
      setCheckedCategories(null)
      setAllChecked(false)
    }},
    [transactions.loading])
  useEffect(() => {
    !transactions.results && dispatch(FinanceApi.getTransactions(token, kwargs))
    !categories.results && dispatch(FinanceApi.getCategories(token))
    setCheckedCategories(null)
    dispatch(setKwargs({...kwargs, page: !transactions.previous
        ? 1
        : (parseInt(new URL(transactions.previous).searchParams.get("page")) || 1) + 1}))
  }, [categories.results, transactions.results])

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Categorize
        <div className="mb-0 text-muted"><small>Train and improve the auto detection engine</small></div>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item active" aria-current="page">Categorize</li>
        </ol>
      </nav>
    </div>
    {alertOpen && <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>{transactions.errors}</Alert>}
    <div className="row">
      <div className="col-md-9 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Transactions
              <button type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={() => {
                  dispatch(FinanceApi.getCategories(token))
                  dispatch(FinanceApi.getTransactions(token, kwargs))
                }}
              >
                <i className="mdi mdi-refresh"></i>
              </button>
              <div className="float-right">
                {
                  unpredictedCategories?.length
                    ? <Button
                      className={"btn btn-sm btn-secondary mr-1"}
                      onClick={() => dispatch(FinanceApi.predict(token, unpredictedCategories, kwargs))}
                    >
                      Predict latest {unpredictedCategories.length}
                    </Button>
                    : null
                }
                {
                  transactions.results?.find(t => t.category === "Unidentified") &&
                  <Button
                    className={"btn btn-sm btn-primary mr-1"}
                    onClick={() => setPredictModalOpen(true)}
                  >
                    Predict {checkedCategories?.length || "all"}
                  </Button>
                }
                <Button className={"btn btn-sm btn-warning mr-1"} onClick={() => setTrainModalOpen(true)}>
                  Train model
                </Button>
              </div>
              {
                checkedCategories?.length
                  ? <Button
                    className="btn btn-sm btn-outline-warning ml-1"
                    onClick={() => setSpecificCategoriesModalOpen(true)}
                  >
                    Update {checkedCategories.length} categories
                  </Button>
                  : null
              }
              <div className="mb-0 text-muted">
                <small>Unique: {transactions.count} | Total: {transactions.unidentified_count}</small>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm border-0 bg-transparent"
                  onClick={() => setSearchOpen(!searchOpen)}
                >
                  <i className="mdi mdi-magnify" />
                </button>
              </div>
              {
                messageAlertOpen &&
                <Alert
                  variant={transactions.msg?.level || "primary"}
                  dismissible
                  onClose={() => setMessageAlertOpen(false)}
                >
                  {transactions.msg?.message}
                </Alert>
              }
            </h4>
            {transactionsAlertOpen && <Alert variant="danger" dismissible onClose={() => setTransactionsAlertOpen(false)}>{transactions.errors}</Alert>}

            <Collapse in={ searchOpen }>
              <ul className="navbar-nav w-100 rounded">
                <li className="nav-item w-100">
                  <form
                    className="nav-link mt-2 mt-md-0 d-lg-flex search"
                    onSubmit={e => {
                      e.preventDefault()
                      dispatch(setKwargs({...kwargs, page: 1}))
                      dispatch(FinanceApi.getTransactions(token, {...kwargs, page: 1}))
                    }}
                  >
                    <input
                      value={kwargs.search_term}
                      type="search"
                      className="form-control"
                      placeholder="Search transactions"
                      onChange={e => dispatch(setKwargs({...kwargs, search_term: e.target.value}))}
                    />
                  </form>
                </li>
              </ul>
            </Collapse>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>
                      <div className="form-check form-check-muted m-0">
                        <label className="form-check-label">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={allChecked}
                            onChange={() => setAllChecked(!allChecked)}
                          />
                          <i className="input-helper"></i>
                        </label>
                      </div>
                    </th>
                    <th> Account </th>
                    <th> Started </th>
                    <th> Amount </th>
                    <th> Description </th>
                    <th> Type </th>
                    <th> Category </th>
                    <th> Completed </th>
                    <th><i className="mdi mdi-pencil" /></th>
                  </tr>
                </thead>
                <tbody>
                {
                  transactions.loading
                    ? <Circles
                      visible={true}
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{float: "right"}}
                      color='orange'
                    />
                    : transactions.results?.length
                        ? transactions.results.map((t, i) =>
                        <tr
                          style={{cursor: `${t.category_suggestion ? 'default': 'not-allowed'}`}}
                          key={i}
                          className={getSpecificCategory(t.description) ? "text-warning": ""}
                          onClick={
                            () => onCheckedCategoryChange({
                              value: getSpecificCategory(t.description) ? "Unidentified" : t.category_suggestion
                            }, t.description)}
                        >
                          <td>
                            <div className="form-check form-check-muted m-0 bordered">
                              <label className="form-check-label">
                                <input
                                  disabled={!t.category_suggestion}
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={getSpecificCategory(t.description)}
                                  onChange={() =>
                                    onCheckedCategoryChange({
                              value: getSpecificCategory(t.description) ? "Unidentified" : t.category_suggestion
                            }, t.description)
                                }
                                />
                                <i className="input-helper"></i>
                              </label>
                            </div>
                          </td>
                          <td>{t.account_name}</td>
                          <td> {new Date(t.started_at).toLocaleDateString()}<br />
                            <small>{new Date(t.started_at).toLocaleTimeString()}</small>
                          </td>
                          <td> {t.amount} {parseFloat(t.fee) ? `(Fee: ${t.fee})` : ""} </td>
                          <td> {t.description} </td>
                          <td> {getTypeLabel(t.type)} </td>
                          <td onClick={e => e.stopPropagation()} style={{minWidth: "180px"}}>
                            <Select
                              onChange={newValue => onCheckedCategoryChange(newValue, t.description)}
                              options={categories.results?.map(c => ({label: c.verbose, value: c.id}))}
                              styles={selectStyles}
                              value={{
                                label: capitalize(getSpecificCategory(t.description) || t.category).replace("-", " "),
                                value: getSpecificCategory(t.description) || t.category}}
                            />
                            <p className={"text-warning ml-2"}>{t.category_suggestion ? capitalize(t.category_suggestion).replace("-", " "): null}</p>
                            {
                              getSpecificCategory(t.description) &&
                              <a href={"!#"} onClick={e => {
                                const currentCategory = getSpecificCategory(t.description)
                                e.preventDefault()
                                setCheckedCategories(transactions.results.map(t =>
                                  ({description: t.description, category: currentCategory})
                                ))
                              }}>
                                Set {capitalize(getSpecificCategory(t.description)).replace("-", " ")} to all
                              </a>
                          }
                          </td>
                          <td> {t.completed_at ? new Date(t.completed_at).toLocaleDateString() : t.state} </td>
                          <td>
                            <i
                              className="mdi mdi-pencil text-primary"
                              onClick={e => {
                                e.stopPropagation()
                                dispatch(selectTransaction(t.id))
                              }}
                              style={{cursor: "pointer"}}
                            />
                          </td>
                        </tr>)
                      : <tr><td colSpan={6}><span>No transactions found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
            <div className="align-self-center btn-group mt-4 mr-4" role="group" aria-label="Basic example">
              <button
                type="button"
                className="btn btn-default"
                disabled={!transactions.previous}
                onClick={() => dispatch(FinanceApi.getTransactions(token, {
                }))}
              >
                <i className="mdi mdi-skip-backward"/>
              </button>
              {
                currentPage - 5 > 0 && <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs, page: 2}))}
                >
                  2
                </button>
              }
              {currentPage - 4 > 0 && "..."}
              {
                currentPage - 3 > 0 &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs,page: currentPage - 3}))}
                >
                  {currentPage - 3}
                </button>
              }
              {
                currentPage - 2 > 0 &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs, page: currentPage - 2}))}
                >
                  {currentPage - 2}
                </button>
              }
              {
                transactions.previous &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, {
                    ...kwargs, page: currentPage - 1,
                  }))}
                >
                  {currentPage - 1}
                </button>
              }
              <button type="button" className="btn btn-primary rounded" disabled={true}>{currentPage}</button>
              {
                transactions.next &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, {
                    ...kwargs, page: currentPage + 1,
                 }))}
                >
                  {currentPage + 1}
                </button>
              }
              {
                currentPage + 2 < lastPage &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, {
                    ...kwargs, page: currentPage + 2,
                  }))}
                >
                  {currentPage + 2}
                </button>
              }
              {
                currentPage + 3 < lastPage &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, {
                    ...kwargs, page: currentPage + 3,
                  }))}
                >
                  {currentPage + 3}
                </button>
              }
              {currentPage + 4 < lastPage && "..."}
              {
                currentPage + 5 < lastPage &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, {
                    ...kwargs, page: lastPage - 1,
                  }))}
                >
                  {lastPage - 1}
                </button>
              }
              <button
                type="button"
                className="btn btn-default"
                disabled={!transactions.next}
                onClick={() => dispatch(FinanceApi.getTransactions(token, {
                  ...kwargs, page: lastPage,
                }))}
              >
                <i className="mdi mdi-skip-forward"/>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="col-md-3 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">Filters</h4>
            <Form onSubmit={e => {
              e.preventDefault()
              dispatch(FinanceApi.getTransactions(token, kwargs))
            }}>
              <Form.Group>
                <Form.Label>Confirmed by</Form.Label>&nbsp;
                <Select
                  isClearable
                  isDisabled={transactions.loading}
                  isLoading={transactions.loading}
                  onChange={onConfirmedByChange}
                  options={transactions.confirmedByChoices?.map(c => ({label: c[1], value: c[0]}))}
                  styles={selectStyles}
                  value={{
                    label: transactions.confirmedByChoices?.find(c => c[0] === kwargs.confirmed_by)?.[1],
                    value: kwargs.confirmed_by}}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Category</Form.Label>&nbsp;
                <Select
                  isClearable
                  isDisabled={categories.loading || transactions.loading}
                  isLoading={categories.loading || transactions.loading}
                  onChange={onCategoryChange}
                  options={categories.results?.map(c => ({label: c.verbose, value: c.id}))}
                  styles={selectStyles}
                  value={{
                    label: categories.results?.find(c => c.id === kwargs.category)?.verbose,
                    value: kwargs.category}}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Type</Form.Label>&nbsp;
                <Select
                  closeMenuOnSelect={false}
                  isDisabled={transactions.loading}
                  isLoading={transactions.loading}
                  isMulti
                  onMenuClose={() => dispatch(FinanceApi.getTransactions(token, kwargs))}
                  onChange={onTypeChange}
                  options={transactions.types?.map(t => ({label: getTypeLabel(t), value: t}))}
                  styles={selectStyles}
                  value={kwargs.types?.map(t => ({label: getTypeLabel(t), value: t}))}
                />
              </Form.Group>
            </Form>
          </div>
        </div>
      </div>
    </div>
    <EditModal />
    <Modal centered show={trainModalOpen} onHide={() => setTrainModalOpen(false)}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card mb-1">
              Train model?
            </div>
          </div>
          <p className="text-muted mb-0">Train machine learning model on current categories</p>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-0">This will train the machine learning model on</p>
        <p className="text-danger">all the ML confirmed categories</p>
        <p className="mb-0">Make sure you don't have any dirty data</p>
        <p>e.g. descriptions that might not always belong to the same category</p>
        Proceed?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="success" onClick={() => setTrainModalOpen(false)}>No, go back</Button>
        <Button
          variant="danger"
          onClick={() => {
            dispatch(FinanceApi.train(token, kwargs))
            setTrainModalOpen(false)
          }}
        >
          Yes, train model!
        </Button>
      </Modal.Footer>
    </Modal>
    <Modal centered show={specificCategoriesModalOpen} onHide={() => setSpecificCategoriesModalOpen(false)}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card mb-1">
              Update multiple categories?
            </div>
          </div>
          <p className="text-muted mb-0">Update categories in bulk</p>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-0">This will update all the transactions</p>
        <p>with the descriptions below as follows:</p>
        <ul>
          {checkedCategories?.map((c, i) => <li key={i}>
            {c.description}<span className="text-warning"> -> New category ->&nbsp;</span>
            <span className="text-success">{capitalize(c.category).replace("-", " ")}</span>
          </li>)}
        </ul>
        Proceed?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="success" onClick={() => setSpecificCategoriesModalOpen(false)}>No, go back</Button>
        <Button
          variant="danger"
          onClick={() => {
            dispatch(FinanceApi.bulkUpdateTransactions(token, checkedCategories, kwargs))
            setSpecificCategoriesModalOpen(false)
          }}
        >
          Yes, bulk update!
        </Button>
      </Modal.Footer>
    </Modal>
    <Modal centered show={predictModalOpen} onHide={() => setPredictModalOpen(false)}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card mb-1">
              Predict transactions?
            </div>
          </div>
          <p className="text-muted mb-0">Predict categories for {checkedCategories?.length || "all the"} transactions</p>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-0">This will start predicting the categories for <span className="text-danger">  {checkedCategories?.length || "all the"} transactions</span></p>
        <p className="mb-0">Depending on the number it might take a while so please be patient</p>
        Proceed?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="success" onClick={() => setPredictModalOpen(false)}>No, go back</Button>
        <Button
          variant="danger"
          onClick={() => {
            dispatch(FinanceApi.predict(token, checkedCategories?.map(t => t.description) || [], kwargs))
            setPredictModalOpen(false)
          }}
        >
          Yes, start!
        </Button>
      </Modal.Footer>
    </Modal>

  </div>
}

export default Categorize;
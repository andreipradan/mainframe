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
import { selectTransaction } from "../../../redux/transactionsSlice";

const Categorize = () => {
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token)
  const categories = useSelector(state => state.categories)
  const transactions = useSelector(state => state.transactions)

  const [accuracyAlertOpen, setAccuracyAlertOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [category, setCategory] = useState("")
  const [allChecked, setAllChecked] = useState(false)
  const [checked, setChecked] = useState(null)
  const [confirmedBy, setConfirmedBy] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTypes, setSelectedTypes] = useState(null)
  const [trainModalOpen, setTrainModalOpen] = useState(false)
  const [transactionsAlertOpen, setTransactionsAlertOpen] = useState(false)

  const currentPage = !transactions.previous ? 1 : (parseInt(new URL(transactions.previous).searchParams.get("page")) || 1) + 1
  const isChecked = tId => checked?.length ? checked.find(id => id === tId) : false
  const lastPage = Math.ceil(transactions.count / 25)
  const kwargs = {
    category: category,
    expense: true,
    confirmed_by: confirmedBy,
    page: currentPage,
    search_term: searchTerm,
    type: selectedTypes || [],
  }

  const onCategoryChange = newValue => {
    const newCategory = newValue ? newValue.value : ""
    setCategory(newCategory)
    dispatch(FinanceApi.getTransactions(token, {...kwargs, category: newCategory}))
  }

  const onTypeChange = newValue => {
    setSelectedTypes(newValue.map(v => v.value))
    !newValue.length && dispatch(FinanceApi.getTransactions(token, kwargs))
  }
  const onConfirmedByChange = newValue => {
    const newConfirmedBy = !newValue ? 0 : newValue.value
    setConfirmedBy(newConfirmedBy)
    dispatch(FinanceApi.getTransactions(token, {...kwargs, confirmed_by: newConfirmedBy}))
  }

  useEffect(() => {setAccuracyAlertOpen(!!transactions.accuracy)}, [transactions.accuracy])
  useEffect(() => {setTransactionsAlertOpen(!!transactions.errors)}, [transactions.errors])
  useEffect(() => {!transactions.results && setSelectedTypes(null)}, [])
  useEffect(() => {
    !allChecked
      ? setChecked(null)
      : setChecked(transactions.results?.map(t => t.id))
  }, [allChecked])
  useEffect(() => {
    if(!transactions.loading) {
      setChecked(null)
      setAllChecked(false)
    }},
    [transactions.loading])
  useEffect(() => {
    !transactions.results && dispatch(FinanceApi.getTransactions(token, kwargs))
    !categories.results && dispatch(FinanceApi.getCategories(token))
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
      <div className="col-9 grid-margin">
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
              <Button
                className={"btn btn-sm btn-primary mr-1"}
                onClick={() => dispatch(FinanceApi.predict(token,
                  {descriptions: transactions.results.map(t => t.description)}
                ))}
              >
                Predict
              </Button>
              <Button
                className={"btn btn-sm btn-warning mr-1"}
                onClick={() => setTrainModalOpen(true)}
              >
                Train model
              </Button>
              {
                checked?.length
                  ? <>
                  <Button
                    className="btn btn-sm btn-outline-danger mr-1"
                    onClick={() => dispatch(FinanceApi.acceptSuggestions(token,
                      {descriptions: transactions.results.filter(t => checked.includes(t.id)).map(t => t.description)}
                    ))}
                  >
                    Accept {checked.length} suggestion{checked.length === 1 ? '' : 's'}
                  </Button>
                  <Button
                    className={"btn btn-sm btn-outline-secondary"}
                    onClick={() => dispatch(FinanceApi.clearSuggestions(token, {transaction_ids: checked}))}
                  >
                    Clear suggestions
                  </Button>
                  </>
                  : null
              }
              <div className="mb-0 text-muted">
                <small>Total: {transactions.count}</small>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm border-0 bg-transparent"
                  onClick={() => setSearchOpen(!searchOpen)}
                >
                  <i className="mdi mdi-magnify" />
                </button>
              </div>
              {
                accuracyAlertOpen &&
                <Alert variant="success" dismissible onClose={() => setAccuracyAlertOpen(false)}>
                  Training completed with <b>{(parseFloat(transactions.accuracy) * 100).toFixed(2)}%</b> accuracy 🎉
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
                      dispatch(FinanceApi.getTransactions(token, kwargs))
                    }}
                  >
                    <input
                      value={searchTerm}
                      type="search"
                      className="form-control"
                      placeholder="Search transactions"
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </form>
                </li>
              </ul>
            </Collapse>
            <div className="table-responsive">
              <table className="table table-hover">
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
                          key={i}
                          className={isChecked(t.id) ? "text-warning" : ""}
                          onClick={() => isChecked(t.id)
                                      ? setChecked(checked.filter(id => id !== t.id))
                                      : checked?.length
                                        ? setChecked([...checked, t.id])
                                        : setChecked([t.id])}
                        >
                          <td>
                            <div className="form-check form-check-muted m-0 bordered">
                              <label className="form-check-label">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={isChecked(t.id)}
                                  onChange={() =>
                                    isChecked(t.id)
                                      ? setChecked(checked.filter(id => id !== t.id))
                                      : checked?.length
                                        ? setChecked([...checked, t.id])
                                        : setChecked([t.id])
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
                          <td
                            className={t.category === "Unidentified" ? "text-danger" : ""}
                            onClick={e => {
                              e.stopPropagation()
                              dispatch(selectTransaction(t.id))
                            }}
                            style={{cursor: "pointer"}}
                          >
                            {t.category}
                            <p className={"text-warning"}>{t.category_suggestion}</p>
                          </td>
                          <td> {t.completed_at ? new Date(t.completed_at).toLocaleDateString() : t.state} </td>
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
                  onClick={() => dispatch(FinanceApi.getTransactions(token, {
                    page: 2,
                    search_term: searchTerm,
                  }))}
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
                    label: transactions.confirmedByChoices?.find(c => c[0] === confirmedBy)?.[1],
                    value: confirmedBy}}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Category</Form.Label>&nbsp;
                <Select
                  isClearable
                  isDisabled={categories.loading || transactions.loading}
                  isLoading={categories.loading || transactions.loading}
                  onChange={onCategoryChange}
                  options={categories.results?.map(c => ({label: c.id, value: c.id}))}
                  styles={selectStyles}
                  value={{
                    label: categories.results?.find(c => c.id === category)?.id,
                    value: category}}
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
                  value={selectedTypes?.map(t => ({label: getTypeLabel(t), value: t}))}
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

  </div>
}

export default Categorize;
import React, {useEffect, useRef, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";

import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Select from "react-select";
import { Circles } from "react-loader-spinner";
import { Collapse } from "react-bootstrap";
import "react-datepicker/dist/react-datepicker.css";

import EditModal, { getTypeLabel, selectStyles } from "./EditModal";
import Errors from "../../../shared/Errors";
import BottomPagination from "../../../shared/BottomPagination";
import { PredictionApi } from '../../../../api/finance';
import { TransactionsApi } from '../../../../api/finance/transactions';
import { capitalize, getCategoryVerbose } from '../../../utils';
import { selectItem as selectTransaction, setKwargs } from "../../../../redux/transactionsSlice";
import { setLoadingTask } from "../../../../redux/predictionSlice";

const Categorize = () => {
  const dispatch = useDispatch();

  const kwargs = useSelector(state => state.transactions.kwargs) || {}
  const prediction = useSelector(state => state.prediction)
  const token = useSelector((state) => state.auth.token)
  const transactions = useSelector(state => state.transactions)

  const api = new TransactionsApi(token)

  const [messageAlertOpen, setMessageAlertOpen] = useState(false)
  const [allChecked, setAllChecked] = useState(false)
  const [checkedCategories, setCheckedCategories] = useState(null)
  const [predictHistoryOpen, setPredictHistoryOpen] = useState(false)
  const [predictModalOpen, setPredictModalOpen] = useState(false)
  const [predictionTasksOpen, setPredictionTasksOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [specificCategoriesModalOpen, setSpecificCategoriesModalOpen] = useState(false)
  const [trainHistoryOpen, setTrainHistoryOpen] = useState(false)
  const [trainingModalOpen, setTrainingModalOpen] = useState(false)

  const unpredictedCategories = transactions.results?.filter(t => !t.category_suggestion)?.map(t => t.description)

  const getSpecificCategory = description => checkedCategories?.find(c => c.description === description)?.category

  const onAccountChange = newValue => {
    const newAccount = newValue ? newValue.value : ""
    dispatch(setKwargs({account_id: newAccount, page: 1}))
  }
  const onCategoryChange = newValue => {
    const newCategory = newValue ? newValue.value : ""
    dispatch(setKwargs({category: newCategory, page: 1}))
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
    dispatch(setKwargs({type: newTypes, page: 1}))
  }
  const onConfirmedByChange = newValue => {
    const newConfirmedBy = !newValue ? 0 : newValue.value
    dispatch(setKwargs({confirmed_by: newConfirmedBy, page: 1}))
  }

  useEffect(() => {setMessageAlertOpen(!!transactions.msg)}, [transactions.msg])
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
    }}, [transactions.loading])
  useEffect(() => {
    !prediction.predict && !prediction.train && dispatch(PredictionApi.getTasks(token))
    setCheckedCategories(null)
  }, [])

  const predictTimerIdRef = useRef(null);
  const trainTimerIdRef = useRef(null);
  const [predictPollingCount, setPredictPollingCount] = useState(0)
  const [trainPollingCount, setTrainPollingCount] = useState(0)

  useEffect(() => {
    const startPolling = () => {
      trainTimerIdRef.current = setInterval( () => {
        setTrainPollingCount(trainPollingCount + 1)
        dispatch(PredictionApi.getTask(token, "train", false))
      }, 1000)
      dispatch(setLoadingTask({type: "train", loading: true}))
    };

    const stopPolling = () => {
      setTrainPollingCount(0)
      clearInterval(trainTimerIdRef.current);
      dispatch(setLoadingTask({type: "train", loading: false}))
    };

    if (["executing", "initial"].includes(prediction.train?.status)) startPolling()
    else stopPolling()

    return () => stopPolling()
  }, [prediction.train])

  useEffect(() => {
    const startPolling = () => {
      predictTimerIdRef.current = setInterval( () => {
        setPredictPollingCount(predictPollingCount + 1)
        dispatch(PredictionApi.getTask(token, "predict", false))
      }, 1000)
      dispatch(setLoadingTask({type: "predict", loading: true}))
    };

    const stopPolling = () => {
      setPredictPollingCount(0)
      clearInterval(predictTimerIdRef.current);
      dispatch(setLoadingTask({type: "predict", loading: false}))
      if (prediction.predict?.status === "complete")
        dispatch(api.getList(kwargs))
    };

    if (["executing", "initial", "progress"].includes(prediction.predict?.status)) startPolling()
    else stopPolling()

    return () => stopPolling()
  }, [prediction.predict])

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
    <Errors errors={transactions.errors}/>

    <div className="row">
      <div className="col-md-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title"
                onClick={ () => setPredictionTasksOpen(!predictionTasksOpen) } data-toggle="collapse"
                style={{cursor: "pointer"}}
            >
              Tasks
              {
                prediction.loading
                  ? <Circles
                    visible={true}
                    height={20}
                    width={20}
                    wrapperClass="btn"
                    wrapperStyle={{display: "default"}}
                    ariaLabel="ball-triangle-loading"
                    color='green'
                  />
                  : <button
                    type="button"
                    className="btn btn-outline-success btn-sm border-0 bg-transparent"
                    onClick={e => {
                      e.stopPropagation()
                      dispatch(PredictionApi.getTasks(token))
                    }}
                  >
                      <i className="mdi mdi-refresh" />
                    </button>
              }
              <div className="float-right">
                <Button className={"btn btn-sm btn-warning mr-1"} onClick={e => {
                  e.stopPropagation()
                  setTrainingModalOpen(true)
                }}>
                  Train model
                </Button>
              </div>
              <Errors errors={prediction.errors}/>
              {
                predictionTasksOpen ? null : <small className="small text-muted">Click to expand</small>
              }
            </h4>
             <Collapse in={ predictionTasksOpen }>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Last Updated</th>
                      <th>Status</th>
                      <th>Details</th>
                      <th>Actions</th>
                      {/*<th>History</th>*/}
                    </tr>
                  </thead>
                  <tbody>
                  <tr>
                    <td>Train</td>
                    {
                      prediction.train
                        ? <>
                            <td>{new Date(prediction.train.history[0].timestamp).toLocaleString()}</td>
                            <td>
                              {prediction.train.history[0].status}
                              {trainPollingCount
                                  ? <Circles
                                      height={12}
                                      width={12}
                                      wrapperStyle={{display: "default"}}
                                      wrapperClass="btn pl-1"
                                  />
                                  : null
                              }
                            </td>
                            <td>
                              {
                                prediction.train.accuracy
                                  ? <span>
                                      Accuracy:&nbsp;
                                      {(parseFloat(prediction.train.accuracy) * 100).toFixed(1)}%
                                  </span>
                                  : null
                              }
                              {prediction.train.count ? <><br />Training objects count: {prediction.train.count}</> : null}
                              {
                                prediction.train.error
                                  ? <><br/>Error: {prediction.train.error}</>
                                  : null
                              }
                              <br/>
                              <a href={""} onClick={ e => {
                                e.preventDefault()
                                setTrainHistoryOpen(!trainHistoryOpen)
                              } } data-toggle="collapse">
                                History <i className={`mdi mdi-chevron-${trainHistoryOpen ? 'down' : 'right'}`} />
                              </a>
                              <Collapse in={ trainHistoryOpen }>
                                <ul>
                                  {
                                    prediction.train.history.map((h, i) =>
                                      <li key={i}>
                                        {new Date(h.timestamp).toLocaleString()}
                                        <ul>
                                          {Object.keys(h).filter(k => k !== "timestamp").map((k, i) => <li key={i}>{k}: {h[k]}</li>)}
                                        </ul>

                                      </li>
                                  )}
                                </ul>
                              </Collapse>
                            </td>
                            <td>
                              {
                                prediction.loadingTrain
                                  ? <Circles
                                        height={12}
                                        width={12}
                                        wrapperClass="btn"
                                        wrapperStyle={{display: "default"}}
                                        ariaLabel="ball-triangle-loading"
                                        color='orange'
                                    />
                                  : <button
                                      type="button"
                                      className="btn btn-outline-success btn-sm border-0 bg-transparent"
                                      onClick={() => dispatch(PredictionApi.getTask(token, "train"))}
                                    >
                                      <i className="mdi mdi-refresh" />
                                    </button>
                              }
                            </td>
                            {/*<td>*/}
                            {/*  <ul>*/}
                            {/*    {t.history.map(t=> <li>{t.status}<br/><small>{new Date(t.timestamp).toLocaleString()}</small></li>)}*/}
                            {/*  </ul>*/}
                            {/*</td>*/}
                          </>
                        : <td colSpan={4}> No training task found</td>
                    }

                  </tr>
                  <tr>
                    <td>Predict</td>
                    {
                      prediction.predict
                        ? <>
                            <td>{new Date(prediction.predict.history[0].timestamp).toLocaleString()}</td>
                            <td>
                              {prediction.predict.history[0].status.toUpperCase()}
                              {predictPollingCount
                                  ? <Circles
                                      height={12}
                                      width={12}
                                      wrapperStyle={{display: "default"}}
                                      wrapperClass="btn pl-1"
                                  />
                                  : null
                              }
                            </td>
                            <td>
                              {
                                prediction.predict.operation
                                  ? <><br/><i>{prediction.predict.operation}</i></>
                                  : null
                              }
                              {
                                prediction.predict.progress
                                  ? <><br/>Progress {prediction.predict.progress}%</>
                                  : null
                              }
                              {
                                prediction.predict.error
                                  ? <><br/>Error: {prediction.predict.error}</>
                                  : null
                              }
                              <br/>
                              <a href={""} onClick={ e => {
                                e.preventDefault()
                                setPredictHistoryOpen(!predictHistoryOpen)
                              } } data-toggle="collapse">
                                History <i className={`mdi mdi-chevron-${predictHistoryOpen ? 'down' : 'right'}`} />
                              </a>
                              <Collapse in={ predictHistoryOpen }>
                                <ul>
                                  {
                                    prediction.predict.history.map((h, i) =>
                                      <li key={i}>
                                        {new Date(h.timestamp).toLocaleString()}
                                        <ul>
                                          {Object.keys(h).filter(k => k !== "timestamp").map((k, i) => <li key={i}>{k}: {h[k]}</li>)}
                                        </ul>

                                      </li>
                                  )}
                                </ul>
                              </Collapse>
                            </td>
                            <td>
                              {
                                prediction.loadingPredict
                                  ? <Circles
                                      height={12}
                                      width={12}
                                      wrapperClass="btn"
                                      wrapperStyle={{display: "default"}}
                                      ariaLabel="ball-triangle-loading"
                                      color='orange'
                                  />
                                  : <button
                                      type="button"
                                      className="btn btn-outline-success btn-sm border-0 bg-transparent"
                                      onClick={() => dispatch(PredictionApi.getTask(token, "predict"))}
                                    >
                                      <i className="mdi mdi-refresh" />
                                    </button>
                              }
                            </td>
                          </>
                        : <td colSpan={4}>No prediction task found</td>
                    }
                  </tr>
                  </tbody>
                </table>
              </div>
            </Collapse>
          </div>
        </div>
      </div>
    </div>
    <div className="row">
      <div className="col-md-9 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Transactions
              {
                transactions.loading
                  ? <Circles
                    visible={true}
                    height={20}
                    width={20}
                    wrapperClass="btn"
                    wrapperStyle={{ display: 'default' }}
                    ariaLabel="ball-triangle-loading"
                    color="green"
                  />
                  : <button
                    type="button"
                    className="btn btn-outline-success btn-sm border-0 bg-transparent"
                    onClick={() => {
                      dispatch(api.getList(kwargs));
                      dispatch(PredictionApi.getTasks(token));
                    }}
                  >
                    <i className="mdi mdi-refresh" />
                  </button>
              }
              <div className="float-right">
                {
                  unpredictedCategories?.length
                    ? <Button
                      className={'btn btn-sm btn-secondary mr-1'}
                      onClick={() => dispatch(PredictionApi.predict(token, unpredictedCategories, kwargs))}
                    >
                      Predict latest {unpredictedCategories.length}
                    </Button>
                    : null
                }
                {
                  transactions.results?.find(t => t.category === 'Unidentified') &&
                  <Button
                    className={'btn btn-sm btn-primary mr-1'}
                    onClick={() => setPredictModalOpen(true)}
                  >
                    Predict {checkedCategories?.length || 'all'}
                  </Button>
                }
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
                <small>Total: {transactions.count} | Unidentified: {transactions.unidentified_count}</small>
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
                  variant={transactions.msg?.level || 'primary'}
                  dismissible
                  onClose={() => setMessageAlertOpen(false)}
                >
                  {transactions.msg?.message}
                </Alert>
              }
            </h4>
            <Errors errors={transactions.errors} />

            <Collapse in={searchOpen}>
              <ul className="navbar-nav w-100 rounded">
                <li className="nav-item w-100">
                  <form
                    className="nav-link mt-2 mt-md-0 d-lg-flex search"
                    onSubmit={e => {
                      e.preventDefault();
                      dispatch(setKwargs({ page: 1 }));
                    }}
                  >
                    <input
                      value={kwargs.search_term}
                      type="search"
                      className="form-control"
                      placeholder="Search transactions"
                      onChange={e => dispatch(setKwargs({ search_term: e.target.value }))}
                    />
                  </form>
                </li>
              </ul>
            </Collapse>
            <div className="form-check">
              <label className="form-check-label">
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={transactions.kwargs?.only_expenses || false}
                  onChange={() => dispatch(setKwargs({ only_expenses: !(transactions.kwargs?.only_expenses || false) }))}
                />Expenses only <i className="input-helper" />
              </label>
            </div>
            <div className="form-check">
              <label className="form-check-label">
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={transactions.kwargs?.unique || false}
                  onChange={() => dispatch(setKwargs({ unique: !(transactions.kwargs?.unique || false) }))}
                />Unique <i className="input-helper" />
              </label>
            </div>
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
                          disabled={transactions.loading}
                          onChange={() => setAllChecked(!allChecked)}
                        />
                        <i className="input-helper" />
                      </label>
                    </div>
                  </th>
                  <th> Account</th>
                  <th> Started</th>
                  <th> Amount</th>
                  <th> Description</th>
                  <th> Type</th>
                  <th> Category</th>
                  <th> Completed</th>
                  <th><i className="mdi mdi-pencil" /></th>
                </tr>
                </thead>
                <tbody>
                {
                  transactions.results?.length
                    ? transactions.results.map((t, i) =>
                      <tr
                        style={{ cursor: `${t.category_suggestion ? 'default' : 'not-allowed'}` }}
                        key={i}
                        className={getSpecificCategory(t.description) ? 'text-warning' : ''}
                        onClick={
                          () => onCheckedCategoryChange({
                            value: getSpecificCategory(t.description) ? 'Unidentified' : t.category_suggestion,
                          }, t.description)}
                      >
                        <td>
                          <div className="form-check form-check-muted m-0 bordered">
                            <label className="form-check-label">
                              <input
                                disabled={!t.category_suggestion || transactions.loading}
                                type="checkbox"
                                className="form-check-input"
                                checked={getSpecificCategory(t.description)}
                                onChange={() =>
                                  onCheckedCategoryChange({
                                    value: getSpecificCategory(t.description)
                                      ? 'Unidentified'
                                      : t.category_suggestion,
                                  }, t.description)
                                }
                              />
                              <i className="input-helper" />
                            </label>
                          </div>
                        </td>
                        <td>{t.account_name}</td>
                        <td> {new Date(t.started_at).toLocaleDateString()}<br />
                          <small>{new Date(t.started_at).toLocaleTimeString()}</small>
                        </td>
                        <td> {t.amount} {parseFloat(t.fee) ? `(Fee: ${t.fee})` : ''} </td>
                        <td> {t.description} </td>
                        <td> {getTypeLabel(t.type)} </td>
                        <td onClick={e => e.stopPropagation()} style={{ minWidth: '180px' }}>
                          <Select
                            onChange={newValue => onCheckedCategoryChange(newValue, t.description)}
                            options={transactions.categories?.map(c => ({ label: getCategoryVerbose(c), value: c }))}
                            styles={selectStyles}
                            value={{
                              label: capitalize(getSpecificCategory(t.description) || t.category).replace('-', ' '),
                              value: getSpecificCategory(t.description) || t.category,
                            }}
                          />
                          <p
                            className={'text-warning ml-2'}>{t.category_suggestion ? capitalize(t.category_suggestion).replace('-', ' ') : null}</p>
                          {
                            getSpecificCategory(t.description) &&
                            <a href={'!#'} onClick={e => {
                              const currentCategory = getSpecificCategory(t.description);
                              e.preventDefault();
                              setCheckedCategories(transactions.results.map(t =>
                                ({ description: t.description, category: currentCategory }),
                              ));
                            }}>
                              Set {capitalize(getSpecificCategory(t.description)).replace('-', ' ')} to all
                            </a>
                          }
                        </td>
                        <td> {t.completed_at ? new Date(t.completed_at).toLocaleDateString() : t.state} </td>
                        <td>
                          <i
                            className="mdi mdi-pencil text-primary"
                            onClick={e => {
                              e.stopPropagation();
                              dispatch(selectTransaction(t.id));
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                      </tr>)
                    : <tr>
                      <td colSpan={6}><span>No transactions found</span></td>
                    </tr>
                }
                </tbody>
              </table>
            </div>
            <BottomPagination items={transactions} fetchMethod={api.getList} newApi={true} setKwargs={setKwargs} />
          </div>
        </div>
      </div>
      <div className="col-md-3 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">Filters</h4>
            <Form onSubmit={e => {
              e.preventDefault();
              dispatch(api.getList(kwargs));
            }}>
              <Form.Group>
                <Form.Label>Confirmed by</Form.Label>&nbsp;
                <Select
                  isClearable
                  isDisabled={transactions.loading}
                  isLoading={transactions.loading}
                  onChange={onConfirmedByChange}
                  options={transactions.confirmed_by_choices?.map(c => ({ label: c[1], value: c[0] }))}
                  styles={selectStyles}
                  value={{
                    label: transactions.confirmed_by_choices?.find(c => c[0] === kwargs.confirmed_by)?.[1],
                    value: kwargs.confirmed_by,
                  }}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Category</Form.Label>&nbsp;
                <Select
                  isClearable
                  isDisabled={transactions.loading}
                  isLoading={transactions.loading}
                  onChange={onCategoryChange}
                  options={transactions.categories?.map(c => ({label: getCategoryVerbose(c), value: c}))}
                  styles={selectStyles}
                  value={{
                    label: getCategoryVerbose(kwargs.category),
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
                  onMenuClose={() => dispatch(api.getList(kwargs))}
                  onChange={onTypeChange}
                  options={transactions.types?.map(t => ({label: getTypeLabel(t), value: t}))}
                  styles={selectStyles}
                  value={kwargs.types?.map(t => ({label: getTypeLabel(t), value: t}))}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Account</Form.Label>&nbsp;
                <Select
                  isClearable
                  isDisabled={transactions.loading}
                  isLoading={transactions.loading}
                  onChange={onAccountChange}
                  options={transactions.accounts?.map(account => ({label: `${account.bank} - ${account.type}`, value: account.id}))}
                  styles={selectStyles}
                  value={{
                    label: transactions.accounts?.find(c => c.id === kwargs.account_id)?.bank,
                    value: kwargs.account_id}}
                />
              </Form.Group>

            </Form>
          </div>
        </div>
      </div>
    </div>
    <EditModal />
    <Modal centered show={trainingModalOpen} onHide={() => setTrainingModalOpen(false)}>
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
        <Button variant="success" onClick={() => setTrainingModalOpen(false)}>No, go back</Button>
        <Button
          variant="danger"
          onClick={() => {
            dispatch(PredictionApi.train(token))
            setTrainingModalOpen(false)
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
            dispatch(TransactionsApi.bulkUpdateTransactions(token, checkedCategories, kwargs))
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
            dispatch(PredictionApi.predict(token, checkedCategories?.map(t => t.description) || [], kwargs))
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
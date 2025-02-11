import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";

import { Bar } from "react-chartjs-2";
import { Circles } from "react-loader-spinner";
import { Collapse, Dropdown } from "react-bootstrap";
import { toast } from 'react-toastify';
import Button from 'react-bootstrap/Button';
import DatePicker from "react-datepicker";
import Form from 'react-bootstrap/Form';
import Marquee from "react-fast-marquee";
import Modal from 'react-bootstrap/Modal';
import Select from 'react-select';
import "react-datepicker/dist/react-datepicker.css";

import { AccountsApi } from '../../../../api/finance/accounts';
import { FinanceApi } from '../../../../api/finance';
import { TransactionsApi } from '../../../../api/finance/transactions';
import { capitalize, getCategoryVerbose } from '../../../utils';
import { getTypeLabel, selectStyles } from '../Categorize/EditModal';
import { selectItem, setModalOpen } from "../../../../redux/accountsSlice";
import { selectItem as selectTransaction, setKwargs } from '../../../../redux/transactionsSlice';
import { toastParams } from '../../../../api/auth';
import AccountEditModal from "./components/AccountEditModal";
import BottomPagination from '../../../shared/BottomPagination';
import Errors from "../../../shared/Errors";
import ListItem from "../../../shared/ListItem";
import TransactionsBulkUpdateModal from './components/TransactionsBulkUpdateModal';
import TransactionEditModal from "./components/TransactionEditModal";

const random_rgba = () => {
    const o = Math.round, r = Math.random, s = 255;
    return 'rgba(' + o(r()*s) + ',' + o(r()*s) + ',' + o(r()*s) + ',' + r().toFixed(1) + ')';
}

const getColor = (type, border = false) => {
  switch (type) {
    case "cash": return `rgba(255,245,64,${border ? 1 : 0.2})`
    case "health": return `rgba(75,192,126,${border ? 1 : 0.2})`
    case "restaurants": return `rgba(255,198,0,${border ? 1 : 0.2})`
    case "savings": return `rgba(54,162,235, ${border ? 1 : 0.2})`
    case "shopping": return `rgba(153,102,255,${border ? 1 : 0.2})`
    case "transport": return `rgba(75,192,126,${border ? 1 : 0.2})`
    case "travel": return `rgba(54,162,235, ${border ? 1 : 0.2})`
    case "utilities": return `rgba(255,159,64,${border ? 1 : 0.2})`
    case "Unidentified": return `rgba(255,255,255,${border ? 0.2 : 0.1})`
    default: return random_rgba()
  }
}

const Transactions = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)

  const accounts = useSelector(state => state.accounts)
  const transactions = useSelector(state => state.transactions)

  const [allChecked, setAllChecked] = useState(false)
  const [checkedCategories, setCheckedCategories] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedFile, setSelectedFile] = useState(null)
  const [specificCategoriesModalOpen, setSpecificCategoriesModalOpen] = useState(false)
  const [transactionToRemove, setTransactionToRemove] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const getSpecificCategory = description => checkedCategories?.find(c => c.description === description)?.category
  const paymentsData = {
    labels: accounts.analytics?.per_month.map(p => p.month),
    datasets: accounts.analytics
      ? [
        ...accounts.analytics?.categories?.map(cat => ({
          label: capitalize(cat).replace("-", " "),
          data: accounts.analytics?.per_month?.map(item => item[cat]),
          backgroundColor: getColor(cat),
          borderColor: getColor(cat, true),
          borderWidth: 1,
          fill: false,
        })),
    ] : []
  }
  const paymentsOptions = {
    scales: {
      yAxes: [{
        ticks: {beginAtZero: true},
        gridLines: {color: "rgba(204, 204, 204,0.1)"},
        stacked: true,
      }],
      xAxes: [{gridLines: {color: "rgba(204, 204, 204,0.1)"}, stacked: true}]
    },
    legend: {display: true},
    elements: {point: {radius: 0}},
    tooltips: {
      callbacks: {
        title: (tooltipItem, data) => {
          const item = tooltipItem[0]
          const all = data.datasets.map(d => d.data[item.index]).reduce(
            (partialSum, p) => partialSum + parseFloat(p), 0
          )
          const moneyIn = data.datasets.filter(d => parseFloat(d.data[item.index]) > 0).map(d => d.data[item.index]).reduce(
            (partialSum, p) => partialSum + parseFloat(p), 0
          )
          const moneyOut = data.datasets.filter(d => parseFloat(d.data[item.index]) < 0).map(d => d.data[item.index]).reduce(
            (partialSum, p) => partialSum + parseFloat(p), 0
          )
          let result = `Total: ${all.toFixed(2)}`
          if (moneyIn.toFixed(2) > 0)
            result += `\n(${moneyIn.toFixed(2)}${moneyOut.toFixed(2)})`
          return result
        }
      }
    }
  }

  useEffect(() => {
    Boolean(transactions.msg) && toast.success(
      `${transactions.msg.message}`,
      toastParams)
  }, [transactions.msg])
  useEffect(() => {
    !allChecked
      ? setCheckedCategories(null)
      : setCheckedCategories(transactions.results?.filter(t=>
        Boolean(t.category_suggestion)
      ).map(t => ({description: t.description, category: t.category_suggestion})))
  }, [allChecked])
  useEffect(() => {
    if(!transactions.loading) {
      setCheckedCategories(null)
      setAllChecked(false)
    }}, [transactions.loading])
  useEffect(() => {
    dispatch(AccountsApi.getList(token, true))
    setSpecificCategoriesModalOpen(false)
  }, [])
  useEffect(() => {
    if (accounts.selectedItem && selectedDate) {
      dispatch(FinanceApi.getExpenses(token, accounts.selectedItem.id, selectedDate.getFullYear()))
      dispatch(setKwargs({account_id: accounts.selectedItem.id, year: selectedDate.getFullYear()}))
    }
  }, [accounts.selectedItem])

  useEffect(() => {
    if (accounts.selectedItem && selectedDate && selectedDate.getFullYear() !== transactions.kwargs.year) {
      dispatch(FinanceApi.getExpenses(token, accounts.selectedItem.id, selectedDate.getFullYear()))
      dispatch(setKwargs({account_id: accounts.selectedItem.id, year: selectedDate.getFullYear()}))
    }}, [selectedDate]
  )

  const handleFileChange = e => {
    const file = e.target.files[0]
    if (! ["csv", "xlsx"].includes(file.name.split(".").pop().toLowerCase()))
      setFileError("File extension must be one of: csv, xlsx!")
    else {
      setSelectedFile(e.target.files[0]);
      setFileError(null)
    }
  };

  const handleGetElementAtEvent = element => {
    if (!element.length) return
    setSearchTerm("")
    setSearchOpen(false)
    const month = new Date(Date.parse(`${element[0]._model.label} 1, ${selectedDate.getFullYear()}`)).getMonth() + 1
    const category = element[0]._model.datasetLabel
    dispatch(setKwargs({
      account_id: accounts.selectedItem.id,
      category: category === "Unidentified" ? "Unidentified" : category.toLowerCase().replace(" ", "-"),
      month,
      only_expenses: true,
      page: 1,
      year: selectedDate.getFullYear(),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('file', selectedFile);
    dispatch(TransactionsApi.uploadTransactions(token, formData,{
          account_id: accounts.selectedItem.id,
          year: selectedDate.getFullYear()
        }))
    setUploadOpen(false)
    setSelectedFile(null)
  };

  const onCategoryChange = newValue => {
    const newCategory = newValue ? newValue.value : "Unidentified"
    dispatch(setKwargs({category: newCategory, page: 1}))
  }
  const onCheckedCategoryChange = (newValue, description) => {
    if (!newValue.value) return
    const newCategory = {description, category: newValue.value}
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
  const onConfirmedByChange = newValue => {
    const newConfirmedBy = !newValue ? "" : newValue.value
    dispatch(setKwargs({confirmed_by: newConfirmedBy, page: 1}))
  }
  const onTypeChange = newValue => {
    const newTypes = newValue.map(v => v.value)
    dispatch(setKwargs({type: newTypes, page: 1}))
  }

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        {
          !accounts.selectedItem
            ? <Circles height={30}/>
            : <>
              <Dropdown className="btn btn-outline-primary">
                <Dropdown.Toggle as="a" className="cursor-pointer">
                  {accounts.selectedItem.bank} ({accounts.selectedItem.type})
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {
                    accounts.results?.map(acc =>
                      <Dropdown.Item key={acc.id} href="!#" onClick={evt => {
                        evt.preventDefault();
                        dispatch(selectItem(acc.id));
                      }} className="preview-item" active={acc.id === accounts.selectedItem.id}>
                        <div className="preview-item-content">
                          <p className="preview-subject mb-1">{acc.bank} ({acc.type})</p>
                        </div>
                      </Dropdown.Item>,
                    )
                  }
                </Dropdown.Menu>
              </Dropdown>
              <div className="btn">
                <i className="mdi mdi-pencil cursor-pointer" onClick={() => dispatch(setModalOpen(true))}/>
                <i className="mdi mdi-plus cursor-pointer" onClick={() => dispatch(setModalOpen("new"))} />
              </div>
            </>
        }
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item active" aria-current="page">Accounts</li>
        </ol>
      </nav>
    </div>

    {!accounts.modalOpen && <Errors errors={accounts.errors} />}
    <div className="row">
      <div className="col-sm-12 col-lg-6 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>
              Summary
              <button type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={() => dispatch(AccountsApi.get(token, accounts.selectedItem.id))}
              >
                <i className="mdi mdi-refresh" />
              </button>
            </h5>
            {
              accounts.loading
                ? <Circles />
                : accounts.selectedItem
                  ? <>
                    <ListItem label={"Account"} value={`${accounts.selectedItem.bank} (${accounts.selectedItem.type})`} textType={"primary"}/>
                    <ListItem label={"Number"} value={accounts.selectedItem.number} />
                    <ListItem label={"Transactions"} value={accounts.analytics?.total} />
                  </>
                  : "-"
            }
            </div>
          </div>
      </div>
      <div className="col-sm-12 col-lg-6 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Client</h5>
            {
              accounts.loading
                ? <Circles />
                : accounts.selectedItem
                  ? <>
                    <ListItem label={"First Name"} value={accounts.selectedItem.first_name} />
                    <ListItem label={"Last Name"} value={accounts.selectedItem.last_name} />
                    <ListItem label={"Client Code"} value={accounts.selectedItem.client_code} />
                  </>
                  : "-"
            }
          </div>
        </div>
      </div>
    </div>
    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>Latest Transaction</h6>
            {
              transactions.loading
                ? <Circles />
                : transactions.results?.length
                  ? <Marquee duration={10000} pauseOnHover >
                    <ListItem label={"Completed"} value={transactions.results[0].completed_at} className="mr-3" />
                    <ListItem label={"Started"} value={transactions.results[0].started_at} className="mr-3" />
                    <ListItem label={"Amount"} value={transactions.results[0].amount} textType={parseFloat(transactions.results[0]) < 0 ? "success" : "warning"} className="mr-3" />
                    <ListItem label={"Fee"} value={transactions.results[0].fee} textType={parseFloat(transactions.results[0]) > 0 ? "danger" : ""} className="mr-3" />
                    <ListItem label={"State"} value={transactions.results[0].state} className="mr-3" />
                    <ListItem label={"Description"} value={transactions.results[0].description} className="mr-3" />
                    <ListItem label={"Type"} value={transactions.results[0].type} className="mr-3" />
                    <ListItem label={"Category"} value={capitalize(transactions.results[0].category).replace("-", " ")} className="mr-3" />
                    <ListItem label={"Product"} value={transactions.results[0].product} className="mr-3" />
                  </Marquee>
                  : "-"
            }
          </div>
        </div>
      </div>
    </div>
    <div className="row ">
      <div className="col-sm-12 col-md-12 col-lg-12 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Expenses
              <button
                type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={() => dispatch(FinanceApi.getExpenses(
                  token,
                  accounts.selectedItem.id,
                  selectedDate.getFullYear()))}
              >
                <i className="mdi mdi-refresh" />
              </button>
              {
                accounts.analytics
                  ? <>
                    {
                      accounts.analytics.years.find(y => y === selectedDate.getFullYear() - 1) &&
                      <button
                        type="button"
                        className="btn btn-outline-secondary rounded btn-sm"
                        onClick={() => setSelectedDate(new Date(`${selectedDate.getFullYear() - 1}-01-01`))}
                      >
                        <i className="mdi mdi-skip-previous" />
                      </button>
                    }
                    <DatePicker
                      className="btn btn-outline-secondary rounded btn-sm"
                      dateFormat="yyyy"
                      readOnly={accounts.loading}
                      includeDates={accounts.analytics.years.map(y => new Date(y.toString()))}
                      onChange={date => setSelectedDate(date)}
                      selected={selectedDate}
                      showIcon
                      showYearPicker
                    />
                    {
                      accounts.analytics.years.find(y => y === selectedDate.getFullYear() + 1) &&
                      <button
                        type="button"
                        className="btn btn-outline-secondary rounded btn-sm"
                        onClick={() => setSelectedDate(new Date(`${selectedDate.getFullYear() + 1}-01-01`))}
                      >
                        <i className="mdi mdi-skip-next" />
                      </button>
                    }
                  </>
                  : <Circles />
              }
            </h4>
            {
              accounts.loading
                ? <Circles />
                : accounts.analytics
                  ? <Bar
                    data={paymentsData}
                    getElementAtEvent={handleGetElementAtEvent}
                    options={paymentsOptions}
                    height={100}
                  />
                  : "-"
            }
            </div>
          </div>
      </div>
    </div>
    <div className="row">
      <div className="col-9 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Transactions
              {
                transactions.loading
                  ? <Circles
                    visible
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
                    onClick={() => dispatch(setKwargs({only_expenses: false, page: 1, unique: false}))}
                  >
                    <i className="mdi mdi-refresh" />
                  </button>
              }
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
              <button
                type="button"
                className="btn btn-outline-primary btn-sm border-0 bg-transparent float-right"
                onClick={() => setUploadOpen(!uploadOpen)}
              >
                <i className="mdi mdi-upload" />
              </button>
              <Collapse in={uploadOpen}>
                <Form onSubmit={handleSubmit} className="form-inline">
                  <Form.Group>
                    {fileError ? <Errors errors={[fileError]} /> : null}
                    <div className="custom-file">
                      <Form.Control
                        type="file"
                        className="form-control visibility-hidden"
                        id="customFileLang"
                        lang="es"
                        onChange={handleFileChange}
                      />
                      <label className="custom-file-label" htmlFor="customFileLang">
                        {selectedFile ? selectedFile.name : 'Select a file'}
                      </label>
                    </div>
                  </Form.Group>
                  <button
                    disabled={!selectedFile}
                    type="submit"
                    className="btn btn-outline-warning ml-3 btn-sm"
                  >
                    <i className="mdi mdi-upload" /> Upload
                  </button>
                </Form>
              </Collapse>

              <div className="mb-0 text-muted">
                <small>Total: {transactions.count} {transactions.page_amount ? ` | Amount: ${transactions.page_amount}` : null}</small>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm border-0 bg-transparent"
                  onClick={() => setSearchOpen(!searchOpen)}
                >
                  <i className="mdi mdi-magnify" />
                </button>
              </div>
              <div className="form-check">
                <label className="form-check-label">
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={transactions.kwargs?.only_expenses || false}
                    onChange={() => dispatch(setKwargs({
                      only_expenses: !(transactions.kwargs?.only_expenses || false),
                      page: 1
                    }))}
                  />
                  Expenses only
                  <i className="input-helper" />
                </label>
              </div>
              <div className="form-check">
                <label className="form-check-label">
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={transactions.kwargs?.unique || false}
                    onChange={() => dispatch(setKwargs({
                      unique: !(transactions.kwargs?.unique || false),
                      page: 1
                    }))}
                  />Unique <i className="input-helper" />
                </label>
              </div>

            </h4>
            {!specificCategoriesModalOpen && <Errors errors={transactions.errors} />}
            <Collapse in={searchOpen}>
              <ul className="navbar-nav w-100 rounded">
                <li className="nav-item w-100">
                  <form
                    className="nav-link mt-2 mt-md-0 d-lg-flex search"
                    onSubmit={e => {
                      e.preventDefault();
                      dispatch(setKwargs({search_term: searchTerm, page: 1}));
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
              <table className="table">
                <thead>
                <tr>
                  <th>
                    <div className="form-check form-check-muted m-0">
                      <label className="form-check-label" htmlFor={"all-checkbox"}>
                        <input
                          id={"all-checkbox"}
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
                  <th>Started</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Completed</th>
                  <th className={'text-center'}>Actions</th>
                </tr>
                </thead>
                <tbody>
                {
                  transactions.loading
                    ? <tr>
                      <td colSpan={3}><Circles
                        visible
                        width="100%"
                        ariaLabel="ball-triangle-loading"
                        wrapperStyle={{ float: 'right' }}
                        color="orange"
                      /></td>
                    </tr>
                    : transactions.results?.length
                      ? transactions.results.map((t, i) =>
                        <tr
                          className={getSpecificCategory(t.description) ? 'text-warning' : ''}
                          key={t.id}
                          onClick={() => onCheckedCategoryChange({
                            value: getSpecificCategory(t.description)
                              ? 'Unidentified'
                              : t.category_suggestion,
                          }, t.description)}
                          style={{ cursor: `${t.category_suggestion ? 'default' : 'not-allowed'}` }}
                        >
                          <td>
                            <div className="form-check form-check-muted m-0 bordered">
                              <label className="form-check-label" htmlFor={`checkbox-${i}`}>
                                <input
                                  id={`checkbox-${i}`}
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
                          <td>{new Date(t.started_at).toLocaleDateString()}<br />
                            <small>{new Date(t.started_at).toLocaleTimeString()}</small>
                          </td>
                          <td>{t.amount} {parseFloat(t.fee) ? `(Fee: ${t.fee})` : ''}</td>
                          <td>{t.description}</td>
                          <td>{getTypeLabel(t.type)}</td>
                          <td onClick={e => e.stopPropagation()} style={{ minWidth: '180px' }}>
                            <Select
                              isDisabled={t.category !== "Unidentified"}
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
                          <td>
                            {
                              t.completed_at
                                ? <span>
                                    {new Date(t.completed_at).toLocaleDateString()}<br/>
                                    <small>{new Date(t.completed_at).toLocaleTimeString()}</small>
                                  </span>
                                : t.state
                            }
                          </td>
                          <td className={'text-center'}>
                            <i
                              className="mdi mdi-pencil-outline text-warning ml-1"
                              onClick={() => dispatch(selectTransaction(t.id))}
                              style={{ cursor: 'pointer' }}
                            />
                            <i
                              className="mdi mdi-trash-can-outline text-danger ml-1"
                              onClick={() => setTransactionToRemove(t)}
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
            <BottomPagination items={transactions} fetchMethod={TransactionsApi.getList} setKwargs={setKwargs}/>
          </div>
        </div>
      </div>
      <div className="col-md-3 grid-margin stretch-card">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">Filters</h4>
            <Form onSubmit={e => {
              e.preventDefault()
              dispatch(TransactionsApi.getList(token, transactions.kwargs))
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
                    label: transactions.confirmed_by_choices?.find(c => c[0] === transactions.kwargs.confirmed_by)?.[1] || "All",
                    value: transactions.kwargs.confirmed_by
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
                  options={transactions.categories?.map(c => ({ label: getCategoryVerbose(c), value: c }))}
                  styles={selectStyles}
                  value={{
                    label: getCategoryVerbose(transactions.kwargs.category) || "All",
                    value: transactions.kwargs.category
                  }}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Type</Form.Label>&nbsp;
                <Select
                  closeMenuOnSelect={false}
                  isDisabled={transactions.loading}
                  isLoading={transactions.loading}
                  isMulti
                  onMenuClose={() => dispatch(TransactionsApi.getList(token, transactions.kwargs))}
                  onChange={onTypeChange}
                  options={transactions.types?.map(t => ({ label: getTypeLabel(t), value: t }))}
                  styles={selectStyles}
                  placeholder={"All"}
                  value={transactions.kwargs.types?.map(t => ({ label: getTypeLabel(t), value: t }))}
                />
              </Form.Group>
            </Form>
          </div>
        </div>
      </div>
    </div>
    <AccountEditModal />
    <TransactionEditModal year={selectedDate.getFullYear()}/>
    <Modal centered show={Boolean(transactionToRemove)} onHide={() => setTransactionToRemove(null)}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card mb-1">
              Are you sure you want to delete this transaction?
            </div>
          </div>
          <ul className="text-muted mb-0">
            <li>
              Created: {new Date(transactionToRemove?.created_at).toLocaleDateString()}&nbsp;
              <small>{new Date(transactionToRemove?.created_at).toLocaleTimeString()}</small>
            </li>
            <li>
              Started: {new Date(transactionToRemove?.started_at).toLocaleDateString()}&nbsp;
              <small>{new Date(transactionToRemove?.started_at).toLocaleTimeString()}</small>
            </li>
            <li>
              Amount: {transactionToRemove?.amount} {parseFloat(transactionToRemove?.fee) ? `(Fee: ${transactionToRemove?.fee})` : ''}
            </li>
            <li>Description: {transactionToRemove?.description}</li>
            <li>Type: {getTypeLabel(transactionToRemove?.type)}</li>
            <li>
              Completed:&nbsp;
              {
                transactionToRemove?.completed_at
                  ? <span>
                    {new Date(transactionToRemove?.completed_at).toLocaleDateString()}&nbsp;
                    <small>{new Date(transactionToRemove?.completed_at).toLocaleTimeString()}</small>
                  </span>
                  : "-"
              }
            </li>
          </ul>
        </Modal.Title>
      </Modal.Header>
      {
        (transactions.errors?.detail || transactions.errors?.length) && transactionToRemove
          ? <Errors errors={transactions().errors} />
          : null
      }
      <Modal.Body>Delete transaction?</Modal.Body>
      <Modal.Footer>
        <Button variant="success" onClick={() => setTransactionToRemove(null)}>No, go back</Button>
        <Button
          variant="danger"
          onClick={() => {
            dispatch(TransactionsApi.delete(token, transactionToRemove?.id))
            setTransactionToRemove(null)
          }}
        >
          Yes, delete!
        </Button>
      </Modal.Footer>
    </Modal>
    <TransactionsBulkUpdateModal
      checkedCategories={checkedCategories}
      setSpecificCategoriesModalOpen={setSpecificCategoriesModalOpen}
      specificCategoriesModalOpen={specificCategoriesModalOpen}
      year={selectedDate.getFullYear()}
    />
  </div>
}

export default Transactions;
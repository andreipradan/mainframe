import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";
import "nouislider/distribute/nouislider.css";

import FinanceApi from "../../../../api/finance";
import ListItem from "../../shared/ListItem";
import Alert from "react-bootstrap/Alert";
import Marquee from "react-fast-marquee";
import {useHistory, useParams} from "react-router-dom";
import {setSelectedAccount} from "../../../../redux/accountsSlice";
import {selectTransaction} from "../../../../redux/transactionsSlice";
import { Collapse, Dropdown } from "react-bootstrap";
import EditModal from "./EditModal";
import { Bar } from "react-chartjs-2";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
  return color;
}

const getColor = (type, border = false) => {
  switch (type) {
    case "ATM": return `rgba(255,245,64,${border ? 1 : 0.2})`
    case "CARD_PAYMENT": return `rgba(255,0,52,${border ? 1 : 0.2})`
    case "CARD_REFUND": return `rgba(75,192,126,${border ? 1 : 0.2})`
    case "EXCHANGE": return `rgba(153,102,255,${border ? 1 : 0.2})`
    case "FEE": return `rgba(255,0,0,${border ? 1 : 0.2})`
    case "TOPUP": return `rgba(54,162,235, ${border ? 1 : 0.2})`
    case "TRANSFER": return `rgba(255,159,64,${border ? 1 : 0.2})`
    case "UNIDENTIFIED": return `rgba(255,255,255,${border ? 1 : 0.2})`

    case "Restaurants": return `rgba(153,102,255,${border ? 1 : 0.2})`
    case "Transport": return `rgba(75,192,126,${border ? 1 : 0.2})`
    case "Savings": return `rgba(54,162,235, ${border ? 1 : 0.2})`
    case "Unidentified": return `rgba(255,245,64,${border ? 1 : 0.2})`
    default:
      return getRandomColor()
  }
}

const AccountDetails = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const token = useSelector((state) => state.auth.token)
  const { id } = useParams();

  const accounts = useSelector(state => state.accounts)
  const [alertOpen, setAlertOpen] = useState(false)
  useEffect(() => {setAlertOpen(!!accounts.errors)}, [accounts.errors])
  useEffect(() => {
    !accounts.selectedAccount &&
    dispatch(FinanceApi.getAccount(token, id))}, [accounts.selectedAccount]
  )
  useEffect(() => {
    !accounts.analytics &&
    dispatch(FinanceApi.getAnalytics(token, id))}, [accounts.analytics]
  )

  const transactions = useSelector(state => state.transactions)
  const [transactionsAlertOpen, setTransactionsAlertOpen] = useState(false)
  useEffect(() => {setTransactionsAlertOpen(!!transactions.errors)}, [transactions.errors])
  useEffect(() => {
    if (accounts.selectedAccount && selectedDate) {
      dispatch(FinanceApi.getAnalytics(token, accounts.selectedAccount.id, selectedDate.getFullYear()))
      dispatch(FinanceApi.getTransactions(token, {
        account_id: accounts.selectedAccount.id,
        year: selectedDate.getFullYear(),
      }))
    }
  }, [accounts.selectedAccount])
  const currentPage = !transactions.previous ? 1 : (parseInt(new URL(transactions.previous).searchParams.get("page")) || 1) + 1
  const lastPage = Math.ceil(transactions.count / 25)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const paymentsData = {
    labels: accounts.analytics?.per_month.map(p => p.month),
    datasets: accounts.analytics
      ? [
        ...accounts.analytics?.categories?.map(cat => ({
          label: cat,
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
          return `Balance: ${(all).toFixed(2)}\n(${moneyIn.toFixed(2)}${moneyOut.toFixed(2)})`
        }
      }
    }
  }
  const renderYearContent = (year) => {
    const tooltipText = `Tooltip for year: ${year}`;
    return <span title={tooltipText}>{year}</span>;
  };
  const [selectedDate, setSelectedDate] = useState(new Date())
  useEffect(() => {
    if (accounts.selectedAccount && selectedDate) {
      dispatch(FinanceApi.getAnalytics(token, accounts.selectedAccount.id, selectedDate.getFullYear()))
      dispatch(FinanceApi.getTransactions(token, {
          account_id: accounts.selectedAccount.id,
          year: selectedDate.getFullYear()
        })
      )
    }},
    [selectedDate]
  )
  const handleGetElementAtEvent = element => {
    if (!element.length) return
    setSearchTerm("")
    setSearchOpen(false)
    const month = element[0]._model.label
    const category = element[0]._model.datasetLabel
    dispatch(FinanceApi.getTransactions(token, {
      account_id: accounts.selectedAccount.id,
      month: new Date(`${month} ${selectedDate.getFullYear()}`).getMonth() + 1,
      category: category,
      year: selectedDate.getFullYear(),
    }))
  }
  return <div>
    <div className="page-header">
      <h3 className="page-title">
        {
          !accounts.selectedAccount
            ? <Circles height={30}/>
            : <Dropdown className="btn btn-outline-primary">
              <Dropdown.Toggle as="a" className="cursor-pointer">
                {accounts.selectedAccount.bank} ({accounts.selectedAccount.type})
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {
                  accounts.results?.map((acc, i) =>
                    <Dropdown.Item key={i} href="!#" onClick={evt => {
                      evt.preventDefault()
                      dispatch(setSelectedAccount(accounts.results.find(a => a.id === acc.id)))
                      history.push(`/finances/accounts/${acc.id}`)
                    }} className="preview-item" active={acc.id === accounts.selectedAccount.id}>
                      <div className="preview-item-content">
                        <p className="preview-subject mb-1">{acc.bank} ({acc.type})</p>
                      </div>
                    </Dropdown.Item>
                  )
                }
              </Dropdown.Menu>
            </Dropdown>
        }
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item"><a href="" onClick={e => {
            e.preventDefault()
            dispatch(setSelectedAccount())
            transactions.selectedTransaction && dispatch(selectTransaction())
            history.push("/finances/accounts")
          }}>Accounts</a></li>
          <li className="breadcrumb-item active" aria-current="page">{accounts.selectedAccount?.number}</li>
        </ol>
      </nav>
    </div>
    {alertOpen && <Alert variant="danger" dismissible onClose={() => setAlertOpen(false)}>{accounts.errors}</Alert>}
    <div className="row">
      <div className="col-sm-12 col-lg-6 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>
              Summary
              <button type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={() => dispatch(FinanceApi.getAccount(token, accounts.selectedAccount.id))}
              >
                <i className="mdi mdi-refresh"></i>
              </button>
            </h5>
            {
              accounts.loading
                ? <Circles />
                : accounts.selectedAccount
                  ? <>
                    <ListItem label={"Bank"} value={accounts.selectedAccount.bank} textType={"primary"}/>
                    <ListItem label={"Type"} value={accounts.selectedAccount.type} />
                    <ListItem label={"Number"} value={accounts.selectedAccount.number} />
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
                : accounts.selectedAccount
                  ? <>
                    <ListItem label={"First Name"} value={accounts.selectedAccount.first_name} />
                    <ListItem label={"Last Name"} value={accounts.selectedAccount.last_name} />
                    <ListItem label={"Client Code"} value={accounts.selectedAccount.client_code} />
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
            <h6>
              Latest Transaction
              <button type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={() =>
                  dispatch(FinanceApi.getTransactions(token, {
                    account_id: accounts.selectedAccount.id,
                  }))
              }
              >
                <i className="mdi mdi-refresh"></i>
              </button>
            </h6>
            {
              transactions.loading
                ? <Circles />
                : transactions.results?.length
                  ? <Marquee duration={10000} pauseOnHover={true} >
                    <ListItem label={"Completed"} value={transactions.results[0].completed_at} className="mr-3" />
                    <ListItem label={"Started"} value={transactions.results[0].started_at} className="mr-3" />
                    <ListItem label={"Amount"} value={transactions.results[0].amount} textType={parseFloat(transactions.results[0]) < 0 ? "success" : "warning"} className="mr-3" />
                    <ListItem label={"Fee"} value={transactions.results[0].fee} textType={parseFloat(transactions.results[0]) > 0 ? "danger" : ""} className="mr-3" />
                    <ListItem label={"State"} value={transactions.results[0].state} className="mr-3" />
                    <ListItem label={"Description"} value={transactions.results[0].description} className="mr-3" />
                    <ListItem label={"Type"} value={transactions.results[0].type} className="mr-3" />
                    <ListItem label={"Category"} value={transactions.results[0].category} className="mr-3" />
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
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(FinanceApi.getAnalytics(token, accounts.selectedAccount.id, selectedDate.getFullYear()))}>
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
                      renderMonthContent={renderYearContent}
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
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Transactions
              <button
                type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={() => {
                  dispatch(FinanceApi.getTransactions(token, {
                    account_id: accounts.selectedAccount.id,
                    page: currentPage,
                    search_term: searchTerm,
                    year: selectedDate.getFullYear(),
                  }))
                }
              }>
                <i className="mdi mdi-refresh" />
              </button>
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
            </h4>
            {transactionsAlertOpen && <Alert variant="danger" dismissible onClose={() => setTransactionsAlertOpen(false)}>{transactions.errors}</Alert>}

            <Collapse in={ searchOpen }>
              <ul className="navbar-nav w-100 rounded">
                <li className="nav-item w-100">
                  <form
                    className="nav-link mt-2 mt-md-0 d-lg-flex search"
                    onSubmit={e => {
                      e.preventDefault()
                      dispatch(
                        FinanceApi.getTransactions(
                          token,
                          {
                            account_id: accounts.selectedAccount.id,
                            search_term: searchTerm,
                            year: selectedDate.getFullYear(),
                          }
                        )
                      )
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
                        ? transactions.results.map((t, i) => <tr key={i} onClick={() => dispatch(selectTransaction(t.id))}>
                          <td> {new Date(t.started_at).toLocaleDateString()} </td>
                          <td> {t.amount} {parseFloat(t.fee) ? `(Fee: ${t.fee})` : ""} </td>
                          <td> {t.description} </td>
                          <td> {t.type} </td>
                          <td className={t.category === "Unidentified" ? "text-danger" : ""}> {t.category} </td>
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
                  account_id: accounts.selectedAccount.id,
                  year: selectedDate.getFullYear(),
                }))}
              >
                <i className="mdi mdi-skip-backward"/>
              </button>
              {
                currentPage - 5 > 0 && <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, {
                    account_id: accounts.selectedAccount.id,
                    page: 2,
                    search_term: searchTerm,
                    year: selectedDate.getFullYear(),
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
                  onClick={() => dispatch(FinanceApi.getTransactions(token, {
                    account_id: accounts.selectedAccount.id,
                    page: currentPage - 3,
                    search_term: searchTerm,
                    year: selectedDate.getFullYear(),
                  }))}
                >
                  {currentPage - 3}
                </button>
              }
              {
                currentPage - 2 > 0 &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, {
                    account_id: accounts.selectedAccount.id,
                    page: currentPage - 2,
                    search_term: searchTerm,
                    year: selectedDate.getFullYear(),
                  }))}
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
                    account_id: accounts.selectedAccount.id,
                    page: currentPage - 1,
                    search_term: searchTerm,
                    year: selectedDate.getFullYear(),
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
                    account_id: accounts.selectedAccount.id,
                    page: currentPage + 1,
                    search_term: searchTerm,
                    year: selectedDate.getFullYear(),
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
                    account_id: accounts.selectedAccount.id,
                    page: currentPage + 2,
                    search_term: searchTerm,
                    year: selectedDate.getFullYear(),
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
                    account_id: accounts.selectedAccount.id,
                    page: currentPage + 3,
                    search_term: searchTerm,
                    year: selectedDate.getFullYear(),
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
                    account_id: accounts.selectedAccount.id,
                    page: lastPage - 1,
                    search_term: searchTerm,
                    year: selectedDate.getFullYear(),
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
                  account_id: accounts.selectedAccount.id,
                  page: lastPage,
                  search_term: searchTerm,
                  year: selectedDate.getFullYear(),
                }))}
              >
                <i className="mdi mdi-skip-forward"/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <EditModal />

  </div>
}

export default AccountDetails;
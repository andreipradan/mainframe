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

const AccountDetails = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const token = useSelector((state) => state.auth.token)
  const { id } = useParams();

  const accounts = useSelector(state => state.accounts)
  useEffect(() => {!accounts.selectedAccount && dispatch(FinanceApi.getAccount(token, id))}, [accounts.selectedAccount]);
  useEffect(() => {!accounts.analytics && dispatch(FinanceApi.getAnalytics(token, id))}, [accounts.analytics]);

  const transactions = useSelector(state => state.transactions)
  const [transactionsAlertOpen, setTransactionsAlertOpen] = useState(false)
  useEffect(() => {setTransactionsAlertOpen(!!transactions.errors)}, [transactions.errors])
  useEffect(() => {
    if (accounts.selectedAccount) {
      dispatch(FinanceApi.getAnalytics(token, accounts.selectedAccount.id))
      dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id))
    }
  }, [accounts.selectedAccount])
  const currentPage = !transactions.previous ? 1 : (parseInt(new URL(transactions.previous).searchParams.get("page")) || 1) + 1
  const lastPage = Math.ceil(transactions.count / 25)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [moneyIn, setMoneyIn] = useState(null)
  const [moneyOut, setMoneyOut] = useState(null)
  const [labels, setLabels] = useState(null)

  useEffect(() => {
    setMoneyIn(accounts.analytics?.per_month.map(p => p.money_in))
    setMoneyOut(accounts.analytics?.per_month.map(p => p.money_out))
    setLabels(accounts.analytics?.per_month.map(p => p.month))
  }, [accounts.analytics?.per_month.length])

  const paymentsData = {
    labels: labels,
    datasets: [
      {
        label: "Spent",
        data: moneyOut,
        backgroundColor: 'rgba(255,0,52,0.2)',
        borderColor: 'rgba(255,0,52,1)',
        borderWidth: 1,
        fill: false,
      },
      {
        label: 'Gains',
        data: moneyIn,
        backgroundColor: context => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, 'rgba(243,16,65,0.2)');
          gradient.addColorStop(0.5, 'rgb(255,210,64, 0.2)');
          gradient.addColorStop(1, 'rgba(47,113,190,0.2)');
          return gradient;
        },
        borderColor: context => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, context.height || 100);
          gradient.addColorStop(0, 'rgba(243,16,65,1)');
          gradient.addColorStop(0.5, 'rgb(255,210,64, 1)');
          gradient.addColorStop(1, 'rgb(47,113,190)');
          return gradient;
        },
        borderWidth: 1,
        fill: false
      },
    ]
  };

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
        label: (tooltipItem, data) => {
          const otherValue = data.datasets[tooltipItem.datasetIndex === 0 ? 1 : 0].data[tooltipItem.index]
          const currentValue = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
          const percentage = parseFloat((currentValue / (parseFloat(currentValue) + parseFloat(otherValue)) * 100).toFixed(1));
          return data.datasets[tooltipItem.datasetIndex].label + ": " + currentValue + ' (' + percentage + '%)';
        },
        title: (tooltipItem, data) => {
          const item = tooltipItem[0]
          const otherValue = parseFloat(data.datasets[item.datasetIndex === 0 ? 1 : 0].data[item.index])
          const currentValue = parseFloat(data.datasets[item.datasetIndex].data[item.index]);
          return `Total: ${(item.datasetIndex === 1 ? currentValue - otherValue : otherValue - currentValue).toFixed(2)}`
        }
      }
    }
  }
  return <div>
    <div className="page-header">
      <h3 className="page-title">
        {
          !accounts.selectedAccount
            ? ""
            : <Dropdown className="btn btn-outline-primary">
              <Dropdown.Toggle as="a" className="cursor-pointer">
                {accounts.selectedAccount.bank} ({accounts.selectedAccount.type})
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {
                  accounts.results?.map((acc, i) =>
                    <Dropdown.Item key={i} href="!#" onClick={evt => {
                      evt.preventDefault()
                      dispatch(FinanceApi.getAccount(token, acc.id))
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
                  dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id))
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
              Analytics
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(FinanceApi.getAnalytics(token, accounts.selectedAccount.id))}>
                <i className="mdi mdi-refresh" />
              </button>
            </h4>
            {
              accounts.loading
                ? <Circles />
                : accounts.analytics ? <Bar data={paymentsData} options={paymentsOptions} height={100}/> : "-"
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
                onClick={() =>
                  dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id, currentPage))
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
                          accounts.selectedAccount.id,
                          currentPage,
                          searchTerm,
                        )
                      )
                    }}
                  >
                    <input type="search" className="form-control" placeholder="Search products" onChange={e => setSearchTerm(e.target.value)}/>
                  </form>
                </li>
              </ul>
            </Collapse>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th> Completed </th>
                    <th> Started </th>
                    <th> Amount </th>
                    <th> Fee </th>
                    <th> State </th>
                    <th> Description </th>
                    <th> Type </th>
                    <th> Product </th>
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
                        ? transactions.results.map((t, i) => <tr key={i}>
                          <td> {new Date(t.completed_at).toLocaleDateString()} </td>
                          <td> {new Date(t.started_at).toLocaleDateString()} </td>
                          <td> {t.amount} </td>
                          <td> {t.fee} </td>
                          <td> {t.state} </td>
                          <td> {t.description} </td>
                          <td> {t.type} </td>
                          <td> {t.product} </td>
                          <td>
                            <i
                              style={{cursor: "pointer"}}
                              className="mr-2 mdi mdi-eye text-secondary"
                              onClick={() => dispatch(selectTransaction(t.id))}
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
                onClick={() => dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id, 1))}
              >
                <i className="mdi mdi-skip-backward"/>
              </button>
              {
                currentPage - 5 > 0 && <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id, 2))}
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
                  onClick={() => dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id, currentPage - 3))}
                >
                  {currentPage - 3}
                </button>
              }
              {
                currentPage - 2 > 0 &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id, currentPage - 2))}
                >
                  {currentPage - 2}
                </button>
              }
              {
                transactions.previous &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id, currentPage - 1))}
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
                  onClick={() => dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id, currentPage + 1))}
                >
                  {currentPage + 1}
                </button>
              }
              {
                currentPage + 2 < lastPage &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id, currentPage + 2))}
                >
                  {currentPage + 2}
                </button>
              }
              {
                currentPage + 3 < lastPage &&
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={() => dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id, currentPage + 3))}
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
                  onClick={() => dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id, lastPage - 1))}
                >
                  {lastPage - 1}
                </button>
              }
              <button
                type="button"
                className="btn btn-default"
                disabled={!transactions.next}
                onClick={() => dispatch(FinanceApi.getTransactions(token, accounts.selectedAccount.id, lastPage))}
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
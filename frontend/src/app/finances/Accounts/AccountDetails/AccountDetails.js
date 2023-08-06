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

const AccountDetails = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const token = useSelector((state) => state.auth.token)
  const { id } = useParams();

  const accounts = useSelector(state => state.accounts)
  useEffect(() => {!accounts.selectedAccount && dispatch(FinanceApi.getAccount(token, id))}, [accounts.selectedAccount]);

  const transactions = useSelector(state => state.transactions)
  const [transactionsAlertOpen, setTransactionsAlertOpen] = useState(false)
  useEffect(() => {setTransactionsAlertOpen(!!transactions.errors)}, [transactions.errors])
  useEffect(() => {!transactions.results && dispatch(FinanceApi.getTransactions(token))}, []);

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Account Details
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(FinanceApi.getAccount(token, accounts.selectedAccount.id))}
        >
          <i className="mdi mdi-refresh"></i>
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item"><a href="!#" onClick={() => {
            dispatch(setSelectedAccount())
            dispatch(selectTransaction())
            history.push("/finances/accounts")
          }}>Accounts</a></li>
          <li className="breadcrumb-item active" aria-current="page">{accounts.selectedAccount?.number}</li>
        </ol>
      </nav>
    </div>
    {transactionsAlertOpen && <Alert variant="danger" dismissible onClose={() => setTransactionsAlertOpen(false)}>{transactions.errors}</Alert>}

    <div className="row">
      <div className="col-sm-12 col-lg-6 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Summary</h5>
            {
              accounts.loading
                ? <Circles />
                : accounts.selectedAccount
                  ? <>
                    <ListItem label={"Bank"} value={accounts.selectedAccount.bank} textType={"primary"}/>
                    <ListItem label={"Number"} value={accounts.selectedAccount.number} />
                    <ListItem label={"Type"} value={accounts.selectedAccount.type} />
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
            <h6>Latest Transaction</h6>
            {
              transactions.loading
                ? <Circles />
                : transactions.results
                  ? <Marquee duration={10000} pauseOnClick={true} >
                    <ListItem label={"Completed"} value={transactions.results[0].completed_at} className="mr-3" />
                    <ListItem label={"Started"} value={transactions.results[0].started_at} className="mr-3" />
                    <ListItem label={"Amount"} value={transactions.results[0].amount} textType={parseFloat(transactions.results[0]) < 0 ? "success" : "warning"} className="mr-3" />
                    <ListItem label={"Fee"} value={transactions.results[0].fee} textType={parseFloat(transactions.results[0]) > 0 ? "danger" : ""} className="mr-3" />
                    <ListItem label={"State"} value={transactions.results[0].state} className="mr-3" />
                    <ListItem label={"Description"} value={transactions.results[0].description} className="mr-3" />
                  </Marquee>
                  : "-"
            }
          </div>
        </div>
      </div>
    </div>
    <div className="row ">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Transactions
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(FinanceApi.getTransactions(token))}>
                <i className="mdi mdi-refresh" />
              </button>
            </h4>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th> Completed at </th>
                    <th> Started </th>
                    <th> Amount </th>
                    <th> Fee </th>
                    <th> State </th>
                    <th> Description </th>
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
                          <td> {t.completed_at} </td>
                          <td> {t.started_at} </td>
                          <td> {t.amount} </td>
                          <td> {t.fee} </td>
                          <td> {t.state} </td>
                          <td> {t.description} </td>
                          <td>
                            <i
                              style={{cursor: "pointer"}}
                              className="mr-2 mdi mdi-pencil text-secondary"
                              onClick={() => dispatch(selectTransaction(t.id))}
                            />
                          </td>
                        </tr>)
                      : <tr><td colSpan={6}><span>No transactions found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
}

export default AccountDetails;
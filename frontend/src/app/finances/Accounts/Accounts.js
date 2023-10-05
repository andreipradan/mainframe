import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";

import { Tooltip } from "react-tooltip";
import { useHistory } from "react-router-dom";
import Marquee from "react-fast-marquee";

import EditModal from "./EditModal";
import ListItem from "../shared/ListItem";
import { FinanceApi } from "../../../api/finance";
import {
  selectAccount,
  setModalOpen,
  setSelectedAccount
} from "../../../redux/accountsSlice";

import { capitalize } from "./AccountDetails/AccountDetails";
import Errors from "../../shared/Errors";

const Accounts = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const token = useSelector((state) => state.auth.token)

  const accounts = useSelector(state => state.accounts)
  const transactions = useSelector(state => state.transactions)

  useEffect(() => {
    accounts.selectedAccount && dispatch(setSelectedAccount())
    !accounts.results?.length && dispatch(FinanceApi.getAccounts(token))
    dispatch(FinanceApi.getTransactions(token))
    return () => dispatch(setSelectedAccount())
  }, []);

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Accounts
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(FinanceApi.getAccounts(token))}
        >
          <i className="mdi mdi-refresh"></i>
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()} >Finances</a></li>
          <li className="breadcrumb-item active" aria-current="page">Accounts</li>
        </ol>
      </nav>
    </div>
    <Errors errors={accounts.errors}/>
    <Errors errors={transactions.errors}/>
    <div className="row">
      <div className="col-sm-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h6>Summary</h6>
            {
              accounts.loading
                ? <Circles />
                : accounts.results?.length
                  ? <Marquee duration={10000} pauseOnHover={true} >
                    <ListItem label={"Total"} value={accounts.results.length} textType={"primary"} className="mr-3" />
                    {
                      [...new Set(accounts.results.map(p => p.type))].map((p, i) =>
                        <ListItem
                          key={i}
                          label={capitalize(p)}
                          value={accounts.results.filter(a => a.type === p).length}
                          textType={"primary"}
                          className="mr-3"
                        />
                      )
                    }
                    {
                      transactions.count && <ListItem
                        label="Transactions"
                        value={transactions.count}
                        textType="primary"
                        className="mr-3"
                      />
                    }
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
              Accounts
              <button
                  type="button"
                  className="float-right btn btn-outline-primary btn-rounded btn-icon pl-1"
                  onClick={() => dispatch(setModalOpen(true))}
              >
                <i className="mdi mdi-plus"></i>
              </button>
            </h4>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th> Type </th>
                    <th> Bank </th>
                    <th> Transactions </th>
                    <th> Number </th>
                    <th> Client code </th>
                    <th> Actions </th>
                  </tr>
                </thead>
                <tbody>
                {
                  accounts.loading
                    ? <Circles
                      visible={true}
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{float: "right"}}
                      color='orange'
                    />
                    : accounts.results?.length
                        ? accounts.results.map((p, i) =>
                        <tr key={i}>
                          <td style={{cursor: "pointer"}} onClick={() => history.push(`/finances/accounts/${p.id}`)}> {capitalize(p.type)} </td>
                          <td style={{cursor: "pointer"}} onClick={() => history.push(`/finances/accounts/${p.id}`)}> {p.bank} </td>
                          <td style={{cursor: "pointer"}} onClick={() => history.push(`/finances/accounts/${p.id}`)}> {p.transaction_count} </td>
                          <td style={{cursor: "pointer"}} onClick={() => history.push(`/finances/accounts/${p.id}`)}> {p.number !== "0" ? p.number : "-"} </td>
                          <td style={{cursor: "pointer"}} onClick={() => history.push(`/finances/accounts/${p.id}`)}> {p.client_code || "-"} </td>
                          <td>
                            <i
                              style={{cursor: "pointer"}}
                              className="mr-2 mdi mdi-pencil text-secondary"
                              onClick={() => dispatch(selectAccount(p.id))}
                            />
                          </td>
                        </tr>)
                      : <tr><td colSpan={6}><span>No accounts found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    <EditModal />
    <Tooltip anchorSelect="#paid-percentage" place="bottom-start">
      Percentage of the remaining principal<br/>
    </Tooltip>
    <Tooltip anchorSelect="#prepaid-percentage" place="bottom-start">
      Percentage of the paid amount
    </Tooltip>
    <Tooltip anchorSelect="#principal-percentage" place="bottom-start">
      Percentage of the total loan
    </Tooltip>
    <Tooltip anchorSelect="#interest-percentage" place="bottom-start">
      Percentage of the remaining interest
    </Tooltip>
  </div>
}

export default Accounts;
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";

import { Collapse } from "react-bootstrap";
import { Tooltip } from "react-tooltip";
import { useHistory } from "react-router-dom";
import Marquee from "react-fast-marquee";

import ListItem from "../../shared/ListItem";
import { FinanceApi } from "../../../api/finance";
import {
  setModalOpen,
  setSelectedAccount
} from "../../../redux/accountsSlice";

import { capitalize } from "./AccountDetails/AccountDetails";
import Errors from "../../shared/Errors";

const Accounts = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const [accountOpen, setAccountOpen] = useState(null);

  const token = useSelector((state) => state.auth.token)

  const accounts = useSelector(state => state.accounts)
  const transactions = useSelector(state => state.transactions)

  const [byBank, setByBank] = useState(null)

  useEffect(() => {
    if (accounts.results?.length) {
      let mapping = {}
      for (let account of accounts.results) {
        mapping[account.bank] = mapping[account.bank]
          ? [...mapping[account.bank], account]
          : [account]
      }
      setByBank(mapping)
    }
  }, [accounts.results]);

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
              <table className="table ">
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
                    : byBank
                        ? Object.entries(byBank).map(([bank, accounts], i) =>
                        <tr key={i} style={{cursor: "pointer"}} onClick={() => accountOpen === bank ? setAccountOpen(null) : setAccountOpen(bank)}>
                          <td><i className={`mdi mdi-chevron-${accountOpen === bank ? 'down text-success' : 'right text-secondary'}`} /></td>
                          <td>{bank}
                            <Collapse in={ accountOpen === bank } style={{width: "100%"}}>
                              <div className="table-responsive mt-3">
                                <table className="table table-hover">
                                  <tbody>
                                  {
                                    accounts.length
                                      ? accounts.map((account, i) => <tr key={i}>
                                        <td style={{cursor: "pointer"}} onClick={() => history.push(`/finances/accounts/${account.id}`)}> {account.type} </td>
                                        <td style={{cursor: "pointer"}} onClick={() => history.push(`/finances/accounts/${account.id}`)}> {account.transaction_count || "no"} transactions </td>
                                        <td style={{cursor: "pointer"}} onClick={() => history.push(`/finances/accounts/${account.id}`)}> {account.number !== "0" ? account.number : "-"} </td>
                                        <td style={{cursor: "pointer"}} onClick={() => history.push(`/finances/accounts/${account.id}`)}> {account.client_code || "-"} </td>
                                      </tr>)
                                      : null
                                  }
                                  <tr></tr>
                                  </tbody>
                                </table>
                              </div>
                            </Collapse>
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
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";

import Errors from "../shared/Errors";
import { ExpensesApi } from "../../api/expenses";
import { selectItem, setModalOpen } from "../../redux/expensesSlice";
import EditModal from "./EditModal";

const Accounts = () => {
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token)
  const expenses = useSelector(state => state.expenses)

  useEffect(() => {
    !expenses.results?.length && dispatch(ExpensesApi.getList(token))
  }, []);

  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Expenses
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(ExpensesApi.getList(token))}
        >
          <i className="mdi mdi-refresh"></i>
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()} >Expenses</a></li>
          <li className="breadcrumb-item active" aria-current="page">My Expenses</li>
        </ol>
      </nav>
    </div>
    <Errors errors={expenses.errors}/>
    <div className="row ">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              <button
                  type="button"
                  className="float-right btn btn-outline-primary btn-rounded btn-icon pl-1"
                  onClick={() => {
                    dispatch(selectItem())
                    dispatch(setModalOpen(true))
                  }}
              >
                <i className="mdi mdi-plus"></i>
              </button>
            </h4>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th> Date </th>
                    <th> Payed by </th>
                    <th> Description </th>
                    <th> Amount </th>
                    <th> Debtors </th>
                  </tr>
                </thead>
                <tbody>
                {
                  expenses.loading
                    ? <tr>
                        <td colSpan={5}>
                          <Circles
                            visible={true}
                            ariaLabel="ball-triangle-loading"
                            wrapperStyle={{
                              display: "block",
                              marginLeft: "auto",
                              marginRight: "auto",
                              width: "25%"
                            }}
                            color='orange'
                          />
                        </td>
                      </tr>
                    : expenses.results?.length
                        ? expenses.results.map((p, i) =>
                          <tr key={i} style={{cursor: "pointer"}} onClick={() => dispatch(selectItem(p.id))}>
                            <td > {p.date} </td>
                            <td >
                              {p.payer.username}
                              <p className="text-small">({p.payer.email})</p>
                            </td>
                            <td> {p.description} </td>
                            <td> {p.currency} {p.amount} </td>
                            {
                              p.debts?.length
                                ? <td>
                                  <ul className="list-arrow">
                                    {p.debts.map((debt, i) =>
                                      <li key={i}>
                                        {debt.user} - {debt.amount}
                                      </li>
                                    )}
                                  </ul>
                                  </td>
                                : <td>
                                  No debts
                                </td>
                            }
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
  </div>
}

export default Accounts;
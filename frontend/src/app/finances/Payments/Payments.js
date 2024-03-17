import React from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";
import "nouislider/distribute/nouislider.css";

import { FinanceApi } from "../../../api/finance";
import { selectItem as selectPayment, setKwargs } from "../../../redux/paymentSlice";
import { useHistory } from "react-router-dom";
import BottomPagination from "../../shared/BottomPagination";
import Errors from "../../shared/Errors";
import PaymentEditModal from "./components/PaymentEditModal";

const Payments = () => {
  const history = useHistory()
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)

  const payment = useSelector(state => state.payment)

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Payments
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(FinanceApi.getCreditPayments(token))}
        >
          <i className="mdi mdi-refresh"></i>
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item"><a href="/finances/credit/details" onClick={event => {
            event.preventDefault()
            history.push("/finances/credit/details")
          }}>Credit</a></li>
          <li className="breadcrumb-item active" aria-current="page">Payments</li>
        </ol>
      </nav>
    </div>
    <div className="row ">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              {!payment.selectedItem && <Errors errors={payment.errors}/>}
              <div className="mb-0 text-muted">Total: {payment.count}</div>
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th> Date </th>
                    <th> Total </th>
                    <th> Is Prepayment </th>
                    <th> Principal </th>
                    <th> Interest </th>
                    <th> Remaining </th>
                    <th> Saved </th>
                    <th> Actions </th>
                  </tr>
                </thead>
                <tbody>
                {
                  payment.loading
                    ? <Circles
                      visible={true}
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{float: "right"}}
                      color='orange'
                    />
                    : payment.results?.length
                        ? payment.results.map((p, i) => <tr key={i}>
                          <td> {p.date} </td>
                          <td> {p.total} </td>
                          <td> <i className={`text-${p.is_prepayment ? "success": "danger"} mdi mdi-${p.is_prepayment ? 'check' : 'close' }`} /> </td>
                          <td> {p.principal} </td>
                          <td> {p.interest} </td>
                          <td> {p.remaining} </td>
                          <td> {p.saved} </td>
                          <td>
                            <i
                              style={{cursor: "pointer"}}
                              className="mr-2 mdi mdi-pencil text-secondary"
                              onClick={() => dispatch(selectPayment(p.id))}
                            />
                          </td>
                        </tr>)
                      : <tr><td colSpan={6}><span>No payments found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
            <BottomPagination items={payment} fetchMethod={FinanceApi.getCreditPayments} setKwargs={setKwargs}/>

          </div>
        </div>
      </div>
    </div>
    <PaymentEditModal />

  </div>
}

export default Payments;
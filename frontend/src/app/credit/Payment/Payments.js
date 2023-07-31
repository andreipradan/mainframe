import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";

import Alert from "react-bootstrap/Alert";
import CreditApi from "../../../api/credit";
import { selectPayment } from "../../../redux/paymentSlice";
import EditModal from "./EditModal";
import {Tooltip} from "react-tooltip";
import {useHistory} from "react-router-dom";
import { calculateSum, getPercentage } from "../utils";

const Payments = () => {
  const dispatch = useDispatch();
  const history = useHistory();

  const token = useSelector((state) => state.auth.token)

  const overview = useSelector(state => state.credit)
  const [overviewAlertOpen, setOverviewAlertOpen] = useState(false)
  useEffect(() => {setOverviewAlertOpen(!!overview.errors)}, [overview.errors])
  useEffect(() => {!overview.details && dispatch(CreditApi.getOverview(token))}, []);
  const credit = overview.details?.credit
  const latestTimetable = overview.details?.latest_timetable

  const payment = useSelector(state => state.payment)
  const [paymentAlertOpen, setPaymentAlertOpen] = useState(false)
  useEffect(() => {setPaymentAlertOpen(!!payment.errors)}, [payment.errors])
  useEffect(() => {!payment.results && dispatch(CreditApi.getPayments(token))}, []);

  const total = calculateSum(payment.results, "total")
  const interest = calculateSum(payment.results, "interest")
  const principal = calculateSum(payment.results, "principal")
  const prepaid = calculateSum(payment.results, "total", "is_prepayment")

  const remainingPrincipal = parseFloat(-payment.results?.[0].remaining)
  const remainingInterest = calculateSum(latestTimetable?.amortization_table, "interest")
  const remainingTotal = remainingPrincipal + remainingInterest
  return <div>
    <div className="page-header">
      <h3 className="page-title">
        Payments
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(CreditApi.getPayments(token))}
        >
          <i className="mdi mdi-refresh"></i>
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
        <li className="breadcrumb-item"><a href="!#" onClick={
          event => {
            event.preventDefault()
            history.push("/credit/overview")
          }
        }>Credit</a></li>
        <li className="breadcrumb-item active" aria-current="page">Payments</li>
        </ol>
      </nav>
    </div>
    <div className="row">
      <div className="col-sm-3 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Total paid</h5>
            <div className="row">
              <div className="col-8 col-sm-12 col-xl-8 my-auto">
                <div className="d-flex d-sm-block d-md-flex align-items-center">
                  {
                    payment.loading
                      ? <Circles
                          visible={true}
                          height="15"
                          ariaLabel="ball-triangle-loading"
                          wrapperStyle={{float: "right"}}
                          color='orange'
                        />
                      : total
                        ? <>
                          <i className="mdi mdi-cash-multiple text-primary"></i>&nbsp;
                          <h4 className="mb-0">{total}</h4>
                        </>
                        : "-"
                  }
                </div>
                <h6 className="text-muted font-weight-normal">
                  ~ { (total / remainingTotal * 100).toFixed(2)}%&nbsp;
                  <i id="paid-percentage" className="mdi mdi-information-outline"/>
                </h6>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-sm-3 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Prepaid</h5>
            <div className="row">
              {
                payment.loading
                  ? <Circles
                        visible={true}
                        height="15"
                        ariaLabel="ball-triangle-loading"
                        wrapperStyle={{float: "right"}}
                        color='orange'
                      />
                  : prepaid
                    ? <>
                      <div className="col-8 col-sm-12 col-xl-8 my-auto">
                        <div className="d-flex d-sm-block d-md-flex align-items-center">
                          <i className="mdi mdi-cash text-success" />&nbsp;
                          <h4 className="mb-0">{prepaid}</h4>
                          <p className="text-success ml-2 mb-0 font-weight-medium">

                          </p>
                        </div>
                        <h6 className="text-muted font-weight-normal">
                          { (prepaid / total * 100).toFixed(2)}%&nbsp;
                          <i id="prepaid-percentage" className="mdi mdi-information-outline"/>
                        </h6>
                      </div>
                    </>
                    : "-"
              }
            </div>
          </div>
        </div>
      </div>
      <div className="col-sm-3 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Principal</h5>
            <div className="row">
              {
                payment.loading
                  ? <Circles
                        visible={true}
                        height="15"
                        ariaLabel="ball-triangle-loading"
                        wrapperStyle={{float: "right"}}
                        color='orange'
                      />
                  : principal
                    ? <>
                        <div className="col-8 col-sm-12 col-xl-8 my-auto">
                          <div className="d-flex d-sm-block d-md-flex align-items-center">
                            <i className="mdi mdi-cash text-success" />&nbsp;
                            <h4 className="mb-0">{principal}</h4>
                            <p className="text-success ml-2 mb-0 font-weight-medium">

                            </p>
                          </div>
                          <h6 className="text-muted font-weight-normal">
                            { (principal / credit?.total * 100).toFixed(2)}%&nbsp;
                            <i id="principal-percentage" className="mdi mdi-information-outline"/>
                          </h6>
                        </div>
                      </>
                    : "-"
              }
            </div>
          </div>
        </div>
      </div>
      <div className="col-sm-3 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Interest</h5>
            <div className="row">
              {
                payment.loading
                  ? <Circles
                        visible={true}
                        height="15"
                        ariaLabel="ball-triangle-loading"
                        wrapperStyle={{float: "right"}}
                        color='orange'
                      />
                  : interest
                    ? <>
                      <div className="col-8 col-sm-12 col-xl-8 my-auto">
                        <div className="d-flex d-sm-block d-md-flex align-items-center">
                          <i className="mdi mdi-cash text-danger" />&nbsp;
                          <h4 className="mb-0">{interest}</h4>
                          <p className="text-success ml-2 mb-0 font-weight-medium">

                          </p>
                        </div>
                        <h6 className="text-muted font-weight-normal">
                          ~ { getPercentage(interest, remainingInterest) }%&nbsp;
                          <i id="interest-percentage" className="mdi mdi-information-outline"/>
                        </h6>

                      </div>
                    </>
                  : "-"
              }
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="row ">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              Payments
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(CreditApi.getPayments(token))}>
                <i className="mdi mdi-refresh" />
              </button>
            </h4>
            <div className="table-responsive">
              {overviewAlertOpen && <Alert variant="danger" dismissible onClose={() => setOverviewAlertOpen(false)}>{overview.errors}</Alert>}
              {paymentAlertOpen && !payment.selectedPayment && <Alert variant="danger" dismissible onClose={() => setPaymentAlertOpen(false)}>{payment.errors}</Alert>}

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
          </div>
        </div>
      </div>
    </div>
    <EditModal />
    <Tooltip anchorSelect="#paid-percentage" place="bottom-start">
      Percentage of the remaining principal<br/>
      Principal: <span className="text-success">{remainingPrincipal}</span><br/>
      Interest: <span className="text-danger">{remainingInterest} ~ </span><br/>
      Total: <span className="text-primary">{remainingTotal.toFixed(2)}</span>
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

export default Payments;
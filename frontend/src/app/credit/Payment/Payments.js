import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";

import Alert from "react-bootstrap/Alert";
import CreditApi from "../../../api/credit";
import { selectPayment } from "../../../redux/paymentSlice";
import EditModal from "./EditModal";
import {Tooltip} from "react-tooltip";

const Payments = () => {
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token)

  const payment = useSelector(state => state.payment)

  const [paymentAlertOpen, setPaymentAlertOpen] = useState(false)
  useEffect(() => {setPaymentAlertOpen(!!payment.errors)}, [payment.errors])
  useEffect(() => {!payment.results && dispatch(CreditApi.getPayments(token))}, []);

  const calculateSum = field => payment.results?.reduce((partialSum, p) => partialSum + parseFloat(p[field]), 0).toFixed(2)
  const total = calculateSum("total")
  const interest = calculateSum("interest")
  const principal = calculateSum("principal")
  const prepaid = payment.results?.reduce((partialSum, p) => {
    if (p.is_prepayment) return partialSum + parseFloat(p.total)
    return partialSum
  }, 0).toFixed(2)

  const credit = payment.results?.[0].credit
  const monthsPassed = payment.results
    ? Object.values(
        payment.results?.reduce((acc, obj) => ({ ...acc, [obj.date.split("-").splice(0,2)]: obj }), {})
      ).length
    : 0

  const estimatedTotalInterest = credit ? (interest / monthsPassed) * credit.latest_timetable.amortization_table.length : 0
  const remainingPrincipal = credit?.latest_timetable.amortization_table[0].remaining
  const remainingInterest = credit?.latest_timetable.amortization_table.reduce(
    (partialSum, p) => partialSum + parseFloat(p.interest), 0
  ).toFixed(2)
  const remainingTotal = parseFloat(remainingPrincipal) + parseFloat(remainingInterest)
  return <div>
    <div className="row">
      {
        paymentAlertOpen && !payment.selectedPayment
          ? <div className="col-sm-12 grid-margin"><Alert variant="danger" dismissible onClose={() => setPaymentAlertOpen(false)}>{payment.errors}</Alert></div>
          : <>
            <div className="col-sm-3 grid-margin">
              <div className="card">
                <div className="card-body">
                  <h5>
                    Paid
                  </h5>
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
                                ~ { (interest / estimatedTotalInterest * 100).toFixed(2)}%&nbsp;
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
          </>
      }
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
              {paymentAlertOpen && !payment.selectedPayment && <Alert variant="danger" dismissible onClose={() => setPaymentAlertOpen(false)}>{payment.errors}</Alert>}

              <table className="table">
                <thead>
                  <tr>
                    <th> Date </th>
                    <th> Total </th>
                    <th> Is Prepayment </th>
                    <th> Principal </th>
                    <th> Interest </th>
                    <th> Remaining </th>
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
      Percentage of the remaining amount<br/>
      Principal: <span className="text-success">{remainingPrincipal}</span><br/>
      Interest: <span className="text-danger">~ {remainingInterest}</span><br/>
      Total: <span className="text-primary">{remainingTotal.toFixed(2)}</span>
    </Tooltip>
    <Tooltip anchorSelect="#prepaid-percentage" place="bottom-start">
      Percentage of the paid amount
    </Tooltip>
    <Tooltip anchorSelect="#principal-percentage" place="bottom-start">
      Percentage of the total loan
    </Tooltip>
    <Tooltip anchorSelect="#interest-percentage" place="bottom-start">
      Percentage of the estimated remaining interest<br/>
      based on a median of the previous interest payments
    </Tooltip>
  </div>
}

export default Payments;
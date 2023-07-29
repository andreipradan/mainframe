import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";
import { Tooltip } from 'react-tooltip'

import Alert from "react-bootstrap/Alert";
import CreditApi from "../../api/credit";
import { selectPayment } from "../../redux/paymentSlice";

const Payments = () => {
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token)

  const credit = useSelector(state => state.credit)
  const payment = useSelector(state => state.payment)

  const [overviewAlertOpen, setOverviewAlertOpen] = useState(false)
  useEffect(() => {setOverviewAlertOpen(!!credit.errors)}, [credit.errors])
  useEffect(() => {!credit.details && dispatch(CreditApi.getOverview(token))}, []);

  const [paymentAlertOpen, setPaymentAlertOpen] = useState(false)
  useEffect(() => {setPaymentAlertOpen(!!payment.errors)}, [payment.errors])
  useEffect(() => {!payment.results && dispatch(CreditApi.getPayments(token))}, []);

  return <div>
    <div className="row">
      {
        overviewAlertOpen
          ? <div className="col-sm-12 grid-margin"><Alert variant="danger" dismissible onClose={() => setOverviewAlertOpen(false)}>{credit.errors}</Alert></div>
          : <>
            <div className="col-sm-4 grid-margin">
              <div className="card">
                <div className="card-body">
                  <h5>
                    Paid
                    <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(CreditApi.getOverview(token))}>
                      <i className="mdi mdi-refresh" />
                    </button>
                  </h5>
                  <div className="row">
                    <div className="col-8 col-sm-12 col-xl-8 my-auto">
                      <div className="d-flex d-sm-block d-md-flex align-items-center">
                        {
                          credit.loading
                            ? <Circles
                                visible={true}
                                height="15"
                                ariaLabel="ball-triangle-loading"
                                wrapperStyle={{float: "right"}}
                                color='orange'
                              />
                            : credit.details?.paid?.total
                              ? <>

                                    <i className="mdi mdi-cash-multiple text-primary"></i>&nbsp;
                                    <h4 className="mb-0">RON {credit.details.paid.total}</h4>
                              </>
                              : "-"
                        }
                      </div>
                      <h6 className="text-muted font-weight-normal">
                        100% of total
                      </h6>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-sm-4 grid-margin">
              <div className="card">
                <div className="card-body">
                  <h5>Interest</h5>
                  <div className="row">
                    {
                      credit.loading
                        ? <Circles
                              visible={true}
                              height="15"
                              ariaLabel="ball-triangle-loading"
                              wrapperStyle={{float: "right"}}
                              color='orange'
                            />
                        : <>
                          <div className="col-8 col-sm-12 col-xl-8 my-auto">
                            <div className="d-flex d-sm-block d-md-flex align-items-center">
                              <i className="mdi mdi-cash text-danger" />&nbsp;
                              <h4 className="mb-0">RON {credit.details?.paid.interest}</h4>
                              <p className="text-success ml-2 mb-0 font-weight-medium">

                              </p>
                            </div>
                            <h6 className="text-muted font-weight-normal">
                              { (credit.details.paid.interest / credit.details?.paid?.total * 100).toFixed(2)}% of total
                            </h6>

                          </div>
                        </>
                    }
                  </div>
                </div>
              </div>
            </div>
            <div className="col-sm-4 grid-margin">
              <div className="card">
                <div className="card-body">
                  <h5>Principal</h5>
                  <div className="row">
                    {
                      credit.loading
                        ? <Circles
                              visible={true}
                              height="15"
                              ariaLabel="ball-triangle-loading"
                              wrapperStyle={{float: "right"}}
                              color='orange'
                            />
                        : <>
                          <div className="col-8 col-sm-12 col-xl-8 my-auto">
                            <div className="d-flex d-sm-block d-md-flex align-items-center">
                              <i className="mdi mdi-cash text-success" />&nbsp;
                              <h4 className="mb-0">RON {credit.details?.paid.principal}</h4>
                              <p className="text-success ml-2 mb-0 font-weight-medium">

                              </p>
                            </div>
                            <h6 className="text-muted font-weight-normal">
                              { (credit.details.paid.principal / credit.details?.paid?.total * 100).toFixed(2)}% of total
                            </h6>

                          </div>
                        </>
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
              {paymentAlertOpen && <Alert variant="danger" dismissible onClose={() => setPaymentAlertOpen(false)}>{payment.errors}</Alert>}

              <table className="table">
                <thead>
                  <tr>
                    <th> Date </th>
                    <th> Total </th>
                    <th> Is Prepayment </th>
                    <th> Principal </th>
                    <th> Interest </th>
                    <th> Remaining </th>
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
                        ? payment.results.map((month, i) => <tr key={i}>
                          <td> {month.date} </td>
                          <td> {month.total} </td>
                          <td> <i className={`text-${month.is_prepayment ? "success": "danger"} mdi mdi-${month.is_prepayment ? 'check' : 'close' }`} /> </td>
                          <td> {month.principal} </td>
                          <td> {month.interest} </td>
                          <td> {month.remaining} </td>
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
    <Tooltip anchorSelect="#not-clickable" place="bottom-start">
      <span className="font-weight-normal">
        Principal: <span className="text-success">{credit.details?.last_payment?.principal}</span>
      </span>
      <h6 className="font-weight-normal">
        Interest: <span className="text-danger">{credit.details?.last_payment?.interest}</span>
      </h6>
    </Tooltip>
  </div>
}

export default Payments;
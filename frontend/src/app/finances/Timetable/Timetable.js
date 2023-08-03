import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";
import "nouislider/distribute/nouislider.css";
import { Tooltip } from 'react-tooltip'

import Alert from "react-bootstrap/Alert";
import CreditApi from "../../../api/credit";
import { selectTimetable } from "../../../redux/timetableSlice";
import EditModal from "../Timetable/EditModal";

const Timetable = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)

  const timetable = useSelector(state => state.timetable)

  const [timetableAlertOpen, setTimetableAlertOpen] = useState(false)
  useEffect(() => {setTimetableAlertOpen(!!timetable.errors)}, [timetable.errors])
  useEffect(() => {!timetable.results && dispatch(CreditApi.getTimetables(token))}, []);

  return <div>
    <div className="row">
      <div className="col-sm-3 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>
              <i className="mdi mdi-cash text-primary" />&nbsp;
              Summary
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(CreditApi.getTimetables(token))}>
                <i className="mdi mdi-refresh" />
              </button>
            </h5>
            <div className="row">
              <div className="col-8 col-sm-12 col-xl-8 my-auto">
                <div className="d-flex d-sm-block d-md-flex align-items-center">
                  {
                    timetable.loading
                      ? <Circles
                            visible={true}
                            height="15"
                            ariaLabel="ball-triangle-loading"
                            wrapperStyle={{float: "right"}}
                            color='orange'
                          />
                       : timetable.results?.length
                        ? <>
                            <h4 className="mb-0">Total: {timetable.results?.length}</h4>
                          </>
                        : "-"
                  }
            </div>
          </div>
        </div>
      </div>
        </div></div>
      <div className="col-sm-3 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Paid</h5>
            <div className="row">
              {
                timetable.loading
                  ? <Circles
                      visible={true}
                      height="15"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{float: "right"}}
                      color='orange'
                    />
                  : timetable.details?.paid?.total
                    ? <>
                      <div className="col-8 col-sm-12 col-xl-8 my-auto">
                        <div className="d-flex d-sm-block d-md-flex align-items-center">
                          <h4 className="mb-0">RON {timetable.details?.paid?.total}</h4>
                        </div>
                        <h6 className="text-muted font-weight-normal"> Interest: {timetable.details?.paid?.interest}</h6>
                      </div>
                      <div className="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                        <i className="icon-md mdi mdi-wallet-travel text-danger ml-auto"></i>
                      </div>
                    </>
                    : <div className="col-8 col-sm-12 col-xl-8 my-auto">
                        <div className="d-flex d-sm-block d-md-flex align-items-center">
                          -
                        </div>
                        <div className="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                          <i className="icon-md mdi mdi-wallet-travel text-danger ml-auto"></i>
                        </div>
                      </div>
              }
            </div>
          </div>
        </div>
      </div>
      <div className="col-sm-3 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Remaining</h5>
            <div className="row">
              {
                timetable.loading
                  ? <Circles
                      visible={true}
                      height="15"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{float: "right"}}
                      color='orange'
                    />
                  : timetable.details?.paid?.total
                    ? <>
                      <div className="col-8 col-sm-12 col-xl-8 my-auto">
                        <div className="d-flex d-sm-block d-md-flex align-items-center">
                          <h4 className="mb-0">RON {timetable.details?.paid?.total}</h4>
                        </div>
                        <h6 className="text-muted font-weight-normal"> Interest: {timetable.details?.paid?.interest}</h6>
                      </div>
                      <div className="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                        <i className="icon-md mdi mdi-wallet-travel text-danger ml-auto"></i>
                      </div>
                    </>
                    : <div className="col-8 col-sm-12 col-xl-8 my-auto">
                        <div className="d-flex d-sm-block d-md-flex align-items-center">
                          -
                        </div>
                        <div className="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                          <i className="icon-md mdi mdi-wallet-travel text-danger ml-auto"></i>
                        </div>
                      </div>
              }
            </div>
          </div>
        </div>
      </div>
      <div className="col-sm-3 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>
              Last Payment <i id="not-clickable" className="mdi mdi-information-outline"/>
            </h5>
            <div className="row">
              {
                timetable.loading
                  ? <Circles
                      visible={true}
                      height="15"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{float: "right"}}
                      color='orange'
                    />
                  : timetable.details?.last_payment
                    ? <>
                      <div className="col-8 col-sm-12 col-xl-8 my-auto">
                        <div className="d-flex d-sm-block d-md-flex align-items-center">
                          <h4 className="mb-0">RON {timetable.details?.last_payment?.total}</h4>
                        </div>
                        <h6 className="text-muted font-weight-normal">
                          {
                            timetable.details?.last_payment?.is_prepayment
                              ? <>
                                <i className="text-success mdi mdi-check" /> Prepayment
                              </>
                              : <>
                                <i className="text-danger mdi mdi-cash-multiple" /> Installment
                              </>
                          }
                        </h6>

                      </div>
                      <div className="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                        <i className="icon-md mdi mdi-monitor text-success ml-auto"></i>
                      </div>
                    </>
                  : <div className="col-8 col-sm-12 col-xl-8 my-auto">
                      <div className="d-flex d-sm-block d-md-flex align-items-center">
                        -
                      </div>
                      <div className="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                        <i className="icon-md mdi mdi-history text-success ml-auto"></i>
                      </div>
                    </div>
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
              Timetables
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(CreditApi.getTimetables(token))}>
                <i className="mdi mdi-refresh" />
              </button>
            </h4>
            <div className="table-responsive">
              {timetableAlertOpen && <Alert variant="danger" dismissible onClose={() => setTimetableAlertOpen(false)}>{timetable.errors}</Alert>}

              <table className="table">
                <thead>
                  <tr>
                    <th> Date </th>
                    <th> Interest </th>
                    <th> Margin </th>
                    <th> IRCC </th>
                    <th> Months </th>
                    <th> Actions </th>
                  </tr>
                </thead>
                <tbody>
                {
                  timetable.loading
                    ? <Circles
                        visible={true}
                        width="100%"
                        ariaLabel="ball-triangle-loading"
                        wrapperStyle={{float: "right"}}
                        color='orange'
                      />
                    : timetable.results?.length
                        ? timetable.results.map((timetable, i) => <tr key={i}>
                          <td> {timetable.date} </td>
                          <td> {timetable.interest}% </td>
                          <td> {timetable.margin}% </td>
                          <td> {timetable.ircc}% </td>
                          <td> {timetable.amortization_table.length} </td>
                          <td>
                            <i
                              style={{cursor: "pointer"}}
                              className="mr-2 mdi mdi-pencil text-secondary"
                              onClick={() => dispatch(selectTimetable(timetable.id))}
                            />
                            <i
                              style={{cursor: "pointer"}}
                              className="mr-2 mdi mdi-trash-can-outline text-danger"
                              onClick={() => dispatch(CreditApi.deleteTimetable(token, timetable.id))}
                            />
                          </td>
                        </tr>)
                      : <tr><td colSpan={6}><span>No timetables found</span></td></tr>
                }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    <EditModal />
    <Tooltip anchorSelect="#not-clickable" place="bottom-start">
      <span className="font-weight-normal">
        Principal: <span className="text-success">{timetable.details?.last_payment?.principal}</span>
      </span>
      <h6 className="font-weight-normal">
        Interest: <span className="text-danger">{timetable.details?.last_payment?.interest}</span>
      </h6>
    </Tooltip>
  </div>
}

export default Timetable;
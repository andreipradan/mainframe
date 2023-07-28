import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from "react-redux";
import { BallTriangle } from "react-loader-spinner";
import "nouislider/distribute/nouislider.css";

import Alert from "react-bootstrap/Alert";
import CreditApi from "../../../api/credit";
import { selectTimetable } from "../../../redux/creditSlice";
import EditModal from "./EditModal";

const Credit = () => {
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token)

  const credit = useSelector(state => state.credit)

  const [creditAlertOpen, setCreditAlertOpen] = useState(false)
  useEffect(() => {setCreditAlertOpen(!!credit.errors)}, [credit.errors])
  useEffect(() => {!credit.overview && dispatch(CreditApi.getOverview(token))}, []);

  return <div>
    <div className="row">
      <div className="col-sm-4 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>
              Total
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(CreditApi.getOverview(token))}>
                <i className="mdi mdi-refresh" />
              </button>
            </h5>
            <div className="row">
              <div className="col-8 col-sm-12 col-xl-8 my-auto">
                <div className="d-flex d-sm-block d-md-flex align-items-center">
                  <h2 className="mb-0">{credit.overview?.total}</h2>
                </div>
                <h6 className="text-muted font-weight-normal">Date: {credit.overview?.date.toLocaleString()}</h6>
              </div>
              <div className="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                <i className="icon-lg mdi mdi-cash text-primary ml-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-sm-4 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Paid</h5>
            <div className="row">
              <div className="col-8 col-sm-12 col-xl-8 my-auto">
                <div className="d-flex d-sm-block d-md-flex align-items-center">
                  <h2 className="mb-0">RON {credit.overview?.paid?.total}</h2>
                </div>
                <h6 className="text-muted font-weight-normal"> Total Interest: RON {credit.overview?.paid?.interest}</h6>
              </div>
              <div className="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                <i className="icon-lg mdi mdi-wallet-travel text-danger ml-auto"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-sm-4 grid-margin">
        <div className="card">
          <div className="card-body">
            <h5>Last Payment: {credit.overview?.last_payment?.date}</h5>
            <div className="row">
              <div className="col-8 col-sm-12 col-xl-8 my-auto">
                <div className="d-flex d-sm-block d-md-flex align-items-center">
                  <h2 className="mb-0">RON {credit.overview?.last_payment?.total}</h2>
                </div>
                <h6 className="text-muted font-weight-normal">Principal: RON {credit.overview?.last_payment?.principal}</h6>
                <h6 className="text-muted font-weight-normal">Interest: RON {credit.overview?.last_payment?.interest}</h6>
              </div>
              <div className="col-4 col-sm-12 col-xl-4 text-center text-xl-right">
                <i className="icon-lg mdi mdi-monitor text-success ml-auto"></i>
              </div>
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
              <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(CreditApi.getList(token))}>
                <i className="mdi mdi-refresh" />
              </button>
            </h4>
            <div className="table-responsive">
              {creditAlertOpen && <Alert variant="danger" dismissible onClose={() => setCreditAlertOpen(false)}>{credit.errors}</Alert>}

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
                  credit.loading
                    ? <BallTriangle
                      visible={true}
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{}}
                      wrapperClass={{}}
                      color = '#e15b64'
                    />
                    : credit.overview?.timetables?.length
                        ? credit.overview.timetables.map((timetable, i) => <tr key={i}>
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
                        : "No timetables found"
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

export default Credit;
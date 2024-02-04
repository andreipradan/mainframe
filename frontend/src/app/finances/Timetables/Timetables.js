import React, { useEffect } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";
import "nouislider/distribute/nouislider.css";

import { TimetableApi } from "../../../api/finance";
import { selectItem as selectTimetable } from "../../../redux/timetableSlice";
import TimetableEditModal from "./components/TimetableEditModal";
import {useHistory} from "react-router-dom";
import Errors from "../../shared/Errors";

const Timetables = () => {
  const history = useHistory()
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token)
  const timetable = useSelector(state => state.timetable)

  useEffect(() => {!timetable.results && dispatch(TimetableApi.getTimetables(token))}, []);

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Timetables
        <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(TimetableApi.getTimetables(token))}>
          <i className="mdi mdi-refresh" />
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item"><a href="/finances/credit/details" onClick={event => {
            event.preventDefault()
            history.push("/finances/credit/details")
          }}>Credit</a>
          </li>
          <li className="breadcrumb-item active" aria-current="page">Timetables</li>
        </ol>
      </nav>
    </div>
    <div className="row">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <Errors errors={timetable.errors}/>
              <div className="mb-0 text-muted">Total: {timetable.count}</div>
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th> Date </th>
                    <th> Interest </th>
                    <th> Margin </th>
                    <th> IRCC </th>
                    <th> Months </th>
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
                        ? timetable.results.map((timetable, i) =>
                          <tr
                            key={i}
                            onClick={() => dispatch(selectTimetable(timetable.id))}
                            style={{cursor: "pointer"}}
                          >
                            <td> {timetable.date} </td>
                            <td> {timetable.interest}% </td>
                            <td> {timetable.margin}% </td>
                            <td> {timetable.ircc}% </td>
                            <td> {timetable.amortization_table.length} </td>
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
    <TimetableEditModal />
  </div>
}

export default Timetables;
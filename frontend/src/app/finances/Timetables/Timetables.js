import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles } from "react-loader-spinner";
import Alert from "react-bootstrap/Alert";
import "nouislider/distribute/nouislider.css";

import { FinanceApi } from "../../../api/finance";
import { selectTimetable } from "../../../redux/timetableSlice";
import TimetableEditModal from "./components/TimetableEditModal";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import {useHistory} from "react-router-dom";

const Timetables = () => {
  const history = useHistory()
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)

  const overview = useSelector(state => state.credit)
  const [overviewAlertOpen, setOverviewAlertOpen] = useState(false)
  useEffect(() => {setOverviewAlertOpen(!!overview.errors)}, [overview.errors])
  useEffect(() => {
    if (!overview.details) dispatch(FinanceApi.getCredit(token))
    }, [overview.details]
  );

  const payment = useSelector(state => state.payment)
  const [paymentAlertOpen, setPaymentAlertOpen] = useState(false)
  const [timetableToDelete, setTimetableToDelete] = useState(false)
  useEffect(() => {setPaymentAlertOpen(!!payment.errors)}, [payment.errors])
  useEffect(() => {!payment.results && dispatch(FinanceApi.getCreditPayments(token))}, []);

  const timetable = useSelector(state => state.timetable)
  const [timetableAlertOpen, setTimetableAlertOpen] = useState(false)
  useEffect(() => {setTimetableAlertOpen(!!timetable.errors)}, [timetable.errors])
  useEffect(() => {!timetable.results && dispatch(FinanceApi.getCreditTimetables(token))}, []);


  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Timetables
        <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(FinanceApi.getCreditTimetables(token))}>
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
    {overviewAlertOpen && <Alert variant="danger" dismissible onClose={() => setOverviewAlertOpen(false)}>{overview.errors}</Alert>}
    {paymentAlertOpen && <Alert variant="danger" dismissible onClose={() => setPaymentAlertOpen(false)}>{payment.errors}</Alert>}

    <div className="row ">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
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
                              className="mr-2 mdi mdi-eye text-primary"
                              onClick={() => dispatch(selectTimetable(timetable.id))}
                            />
                            <i
                              style={{cursor: "pointer"}}
                              className="mr-2 mdi mdi-trash-can-outline text-danger"
                              onClick={() => setTimetableToDelete(timetable)}
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
    <TimetableEditModal />
    <Modal centered show={timetableToDelete} onHide={() => setTimetableToDelete(false)}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card mb-1">
              Are you sure you want to delete timetable from {timetableToDelete.date}?
            </div>
          </div>
          <p className="text-muted mb-0">Delete timetable</p>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Delete timetable from {timetableToDelete?.date} containing {timetableToDelete?.number_of_months} months ?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="success" onClick={() => setTimetableToDelete(false)}>No, go back</Button>
        <Button
          variant="danger"
          onClick={() => {
            dispatch(FinanceApi.deleteTimetable(token, timetable.id))
            setTimetableToDelete(false)
          }}
        >
          Yes, delete!
        </Button>
      </Modal.Footer>
    </Modal>

  </div>
}

export default Timetables;
import React from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import 'ace-builds'
import 'ace-builds/webpack-resolver'
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";

import { ColorRing } from "react-loader-spinner";
import { TimetableApi } from '../../../../../api/finance';
import { selectItem as selectTimetable } from "../../../../../redux/timetableSlice";

const TimetableEditModal = () => {
  const dispatch = useDispatch();
  const loadingTimetables = useSelector(state => state.timetable.loadingItems)
  const timetable = useSelector(state => state.timetable.selectedItem)
  const token = useSelector((state) => state.auth.token)

  return <Modal
    centered
    show={Boolean(timetable)}
    onHide={() => dispatch(selectTimetable())}
    dialogClassName={"min-vw-75"}
  >
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card mb-1">
            Amortization Table
            <button type="button" className="btn btn-outline-success btn-sm border-0 bg-transparent" onClick={() => dispatch(TimetableApi.get(token, timetable?.id))}>
              <i className="mdi mdi-refresh" />
            </button>
          </div>
        </div>
        <p className="text-muted mb-0">{timetable?.date}</p>
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th> # </th>
              <th> Date </th>
              <th> Total </th>
              <th> Principal </th>
              <th> Interest </th>
              <th> Insurance </th>
              <th> Remaining </th>
            </tr>
          </thead>
          <tbody>
          {
            loadingTimetables?.includes(timetable?.id)
            ? <ColorRing
                width = "100%"
                height = "50"
                wrapperStyle={{width: "100%"}}
              />
            : timetable?.amortization_table.length
                  ? timetable.amortization_table.map((month, i) => <tr key={i}>
                    <td> {i + 1} </td>
                    <td> {month.date} </td>
                    <td> {month.total} </td>
                    <td> {month.principal} </td>
                    <td> {month.interest} </td>
                    <td> {month.insurance} </td>
                    <td> {month.remaining} </td>
                  </tr>)
                  : "No timetables found"
          }
          </tbody>
        </table>
      </div>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="danger" onClick={() => dispatch(TimetableApi.deleteTimetable(token, timetable.id))}>
        Delete
      </Button>
      <Button variant="secondary" onClick={() => dispatch(selectTimetable())}>
        Close
      </Button>
    </Modal.Footer>
  </Modal>
}
export default TimetableEditModal;
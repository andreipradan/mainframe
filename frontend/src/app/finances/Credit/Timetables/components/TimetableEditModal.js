import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { useDispatch, useSelector } from 'react-redux';
import 'ace-builds';
import 'ace-builds/webpack-resolver';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';

import { ColorRing } from 'react-loader-spinner';
import { TimetableApi } from '../../../../../api/finance';
import { selectItem as selectTimetable } from '../../../../../redux/timetableSlice';

function AmortizationRows({ loading, timetable }) {
  const isLoading = loading?.includes(timetable?.id);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={7}>
          <ColorRing
            width='100%'
            height='50'
            wrapperStyle={{ width: '100%' }}
          />
        </td>
      </tr>
    );
  }

  return timetable?.amortization_table.length ? (
    timetable.amortization_table.map((month, index) => (
      <tr key={month.date}>
        <td> {index + 1} </td>
        <td> {month.date} </td>
        <td> {month.total} </td>
        <td> {month.principal} </td>
        <td> {month.interest} </td>
        <td> {month.insurance} </td>
        <td> {month.remaining} </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={7}>No timetables found</td>
    </tr>
  );
}

function AmortizationHeader() {
  return (
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
  );
}

function AmortizationTable({ loading, timetable }) {
  return (
    <div className='table-responsive'>
      <table className='table'>
        <AmortizationHeader />
        <tbody>
          <AmortizationRows loading={loading} timetable={timetable} />
        </tbody>
      </table>
    </div>
  );
}

function TimetableRefreshButton({ onClick }) {
  return (
    <button
      type='button'
      className='btn btn-outline-success btn-sm border-0 bg-transparent'
      onClick={onClick}
    >
      <i className='mdi mdi-refresh' />
    </button>
  );
}

const TimetableEditModal = () => {
  const dispatch = useDispatch();
  const loadingTimetables = useSelector(
    (state) => state.timetable.loadingItems
  );
  const timetable = useSelector((state) => state.timetable.selectedItem);
  const token = useSelector((state) => state.auth.token);

  const api = new TimetableApi(token);

  return (
    <Modal
      centered
      show={Boolean(timetable)}
      onHide={() => dispatch(selectTimetable())}
      dialogClassName={'min-vw-75'}
    >
      <Modal.Header closeButton>
        <Modal.Title>
          Amortization Table{' '}
          <TimetableRefreshButton
            onClick={() => dispatch(api.getItem(timetable?.id))}
          />
          <p className='text-muted mb-0'>{timetable?.date}</p>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <AmortizationTable loading={loadingTimetables} timetable={timetable} />
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant='danger'
          onClick={() => dispatch(api.delete(timetable.id))}
        >
          Delete
        </Button>
        <Button variant='secondary' onClick={() => dispatch(selectTimetable())}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default TimetableEditModal;

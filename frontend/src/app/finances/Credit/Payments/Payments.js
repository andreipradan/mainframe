import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Circles, ColorRing } from 'react-loader-spinner';
import { Collapse } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

import { PaymentsApi } from '../../../../api/finance/payments';
import {
  selectItem as selectPayment,
  setKwargs,
} from '../../../../redux/paymentSlice';
import { useHistory } from 'react-router-dom';
import BottomPagination from '../../../shared/BottomPagination';
import Errors from '../../../shared/Errors';

function PaymentRows({ payment, onSelectPayment }) {
  return (
    <>
      {payment.loading && (
        <Circles
          visible
          width='100%'
          ariaLabel='ball-triangle-loading'
          wrapperStyle={{ float: 'right' }}
          color='orange'
        />
      )}
      {!payment.loading &&
        payment.results?.length > 0 &&
        payment.results.map((item) => (
          <tr
            key={item.id}
            className='cursor-pointer'
            onClick={() => onSelectPayment(item.id)}
          >
            <td> {item.date} </td>
            <td> {item.total} </td>
            <td>
              <i
                className={`text-${item.is_prepayment ? 'success' : 'danger'}
                   mdi mdi-${item.is_prepayment ? 'check' : 'close'}
                   `}
              />
            </td>
            <td> {item.principal} </td>
            <td> {item.interest} </td>
            <td> {item.remaining} </td>
            <td> {item.saved} </td>
            <td>
              <i className='mr-2 mdi mdi-pencil text-secondary' />
            </td>
          </tr>
        ))}
      {!payment.loading && !payment.results?.length && (
        <tr>
          <td colSpan={6}>
            <span>No payments found</span>
          </td>
        </tr>
      )}
    </>
  );
}

function PaymentsTable({ payment, onSelectPayment }) {
  return (
    <table className='table table-hover'>
      <thead>
        <tr>
          <th> Date</th>
          <th> Total</th>
          <th> Is Prepayment</th>
          <th> Principal</th>
          <th> Interest</th>
          <th> Remaining</th>
          <th> Saved</th>
          <th> Actions</th>
        </tr>
      </thead>
      <tbody>
        <PaymentRows payment={payment} onSelectPayment={onSelectPayment} />
      </tbody>
    </table>
  );
}

function PaymentFileInput({ onFileChange, selectedFile }) {
  return (
    <div className='custom-file'>
      <Form.Control
        type='file'
        className='form-control visibility-hidden'
        id='customFileLang'
        lang='es'
        onChange={onFileChange}
      />
      <label className='custom-file-label' htmlFor='customFileLang'>
        {selectedFile ? selectedFile.name : 'Select a file'}
      </label>
    </div>
  );
}

function PaymentUploadForm({
  fileError,
  onFileChange,
  onSubmit,
  selectedFile,
  uploadOpen,
}) {
  return (
    <Collapse in={uploadOpen}>
      <Form onSubmit={onSubmit} className='form-inline'>
        <Form.Group>
          {fileError ? <Errors errors={[fileError]} /> : null}
          <PaymentFileInput
            onFileChange={onFileChange}
            selectedFile={selectedFile}
          />
        </Form.Group>
        <button
          disabled={!selectedFile}
          type='submit'
          className='btn btn-outline-warning ml-3 btn-sm'
        >
          <i className='mdi mdi-upload' /> Upload
        </button>
      </Form>
    </Collapse>
  );
}

function PaymentDetailsModal({
  loading,
  onClose,
  onSave,
  onSavedChange,
  payment,
  saved,
}) {
  return (
    <Modal centered show={Boolean(payment.selectedItem)} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          {payment.selectedItem?.is_prepayment ? 'Prepayment' : 'Installment'}
        </Modal.Title>
        <p className='text-muted mb-0'>{payment.selectedItem?.date}</p>
      </Modal.Header>
      <Modal.Body>
        <Errors errors={payment.errors} />
        {loading ? (
          <ColorRing
            width='100%'
            height='50'
            wrapperStyle={{ width: '100%' }}
          />
        ) : (
          <PaymentSavedForm
            onSave={onSave}
            onSavedChange={onSavedChange}
            saved={saved}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant='secondary' onClick={onClose}>
          Close
        </Button>
        <Button variant='primary' onClick={onSave}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function PaymentSavedForm({ onSave, onSavedChange, saved }) {
  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <Form.Group className='mb-3'>
        <Form.Label>Saved</Form.Label>
        <Form.Control
          type='text'
          value={saved}
          onChange={(event) => onSavedChange(event.target.value)}
        />
      </Form.Group>
    </Form>
  );
}

function PaymentUploadToggle({ onClick }) {
  return (
    <button
      type='button'
      className='btn btn-outline-primary btn-sm border-0 bg-transparent float-right'
      onClick={onClick}
    >
      <i className='mdi mdi-upload' />
    </button>
  );
}

function PaymentsRefreshButton({ onClick }) {
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

function PaymentListCard({
  fileError,
  fetchMethod,
  onFileChange,
  onSelectPayment,
  onSubmit,
  onToggleUpload,
  payment,
  selectedFile,
  uploadOpen,
}) {
  return (
    <div className='card grid-margin'>
      <div className='card-body'>
        <h4 className='card-title'>
          <PaymentUploadToggle onClick={onToggleUpload} />
          <PaymentUploadForm
            fileError={fileError}
            onFileChange={onFileChange}
            onSubmit={onSubmit}
            selectedFile={selectedFile}
            uploadOpen={uploadOpen}
          />
        </h4>
        <div className='table-responsive'>
          {!payment.selectedItem && <Errors errors={payment.errors} />}
          <div className='mb-0 text-muted'>Total: {payment.count}</div>
          <PaymentsTable payment={payment} onSelectPayment={onSelectPayment} />
        </div>
        <BottomPagination
          items={payment}
          fetchMethod={fetchMethod}
          setKwargs={setKwargs}
        />
      </div>
    </div>
  );
}

function PaymentsBreadcrumb({ onNavigate }) {
  return (
    <nav aria-label='breadcrumb'>
      <ol className='breadcrumb'>
        <li className='breadcrumb-item'>
          <a href='!#' onClick={(event) => event.preventDefault()}>
            Finance
          </a>
        </li>
        <li className='breadcrumb-item'>
          <a href='/finances/credit/details' onClick={onNavigate}>
            Credit
          </a>
        </li>
        <li className='breadcrumb-item active' aria-current='page'>
          Payments
        </li>
      </ol>
    </nav>
  );
}

const Payments = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  const api = new PaymentsApi(token);

  const payment = useSelector((state) => state.payment);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [saved, setSaved] = useState(null);

  const [fileError, setFileError] = useState(null);
  const handleFileChange = (e) => {
    if (!e.target.files[0].name.endsWith('.pdf'))
      setFileError('File must be pdf!');
    else {
      setSelectedFile(e.target.files[0]);
      setFileError(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('file', selectedFile);
    dispatch(api.upload(formData));
    setUploadOpen(false);
    setSelectedFile(null);
  };
  useEffect(() => {
    if (payment.selectedItem) setSaved(payment.selectedItem.saved || 0);
  }, [payment.selectedItem]);
  useEffect(() => setUploadOpen(Boolean(payment.errors)), [payment.errors]);

  return (
    <div>
      <div className='page-header mb-0'>
        <h3 className='page-title'>
          Payments{' '}
          <PaymentsRefreshButton onClick={() => dispatch(api.getList())} />
        </h3>
        <PaymentsBreadcrumb
          onNavigate={(event) => {
            event.preventDefault();
            history.push('/finances/credit/details');
          }}
        />
      </div>
      <PaymentListCard
        fileError={fileError}
        fetchMethod={api.getList}
        onFileChange={handleFileChange}
        onSelectPayment={(id) => dispatch(selectPayment(id))}
        onSubmit={handleSubmit}
        onToggleUpload={() => setUploadOpen(!uploadOpen)}
        payment={payment}
        selectedFile={selectedFile}
        uploadOpen={uploadOpen}
      />
      <PaymentDetailsModal
        loading={payment.loadingItems?.includes(payment.selectedItem?.id)}
        onClose={() => dispatch(selectPayment())}
        onSave={() => dispatch(api.update(payment.selectedItem.id, { saved }))}
        onSavedChange={setSaved}
        payment={payment}
        saved={saved}
      />
    </div>
  );
};

export default Payments;

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Circles, ColorRing } from 'react-loader-spinner';
import { Collapse } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

import { PaymentsApi } from '../../../../api/finance/payments';
import { selectItem as selectPayment, setKwargs } from "../../../../redux/paymentSlice";
import { useHistory } from "react-router-dom";
import BottomPagination from "../../../shared/BottomPagination";
import Errors from "../../../shared/Errors";

const Payments = () => {
  const history = useHistory()
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token)

  const api = new PaymentsApi(token)

  const payment = useSelector(state => state.payment)

  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  const [saved, setSaved] = useState(null);

  const [fileError, setFileError] = useState(null)
  const handleFileChange = e => {
    if (!e.target.files[0].name.endsWith(".pdf"))
      setFileError("File must be pdf!")
    else {
      setSelectedFile(e.target.files[0]);
      setFileError(null)
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('file', selectedFile);
    dispatch(api.upload(formData))
    setUploadOpen(false)
    setSelectedFile(null)
  };
  useEffect(() => {
    if (payment.selectedItem) setSaved(payment.selectedItem.saved || 0)
  }, [payment.selectedItem]);
  useEffect(() => setUploadOpen(Boolean(payment.errors)), [payment.errors]);

  return <div>
    <div className="page-header mb-0">
      <h3 className="page-title">
        Payments
        <button type="button"
          className="btn btn-outline-success btn-sm border-0 bg-transparent"
          onClick={() => dispatch(api.getList())}
        >
          <i className="mdi mdi-refresh" />
        </button>
      </h3>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Finance</a></li>
          <li className="breadcrumb-item"><a href="/finances/credit/details" onClick={event => {
            event.preventDefault()
            history.push("/finances/credit/details")
          }}>Credit</a></li>
          <li className="breadcrumb-item active" aria-current="page">Payments</li>
        </ol>
      </nav>
    </div>
    <div className="row ">
      <div className="col-12 grid-margin">
        <div className="card">
          <div className="card-body">
            <h4 className="card-title">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm border-0 bg-transparent float-right"
                onClick={() => setUploadOpen(!uploadOpen)}
              >
                <i className="mdi mdi-upload" />
              </button>
              <Collapse in={uploadOpen}>
                <Form onSubmit={handleSubmit} className="form-inline">
                  <Form.Group>
                    {fileError ? <Errors errors={[fileError]} /> : null}
                    <div className="custom-file">
                      <Form.Control
                        type="file"
                        className="form-control visibility-hidden"
                        id="customFileLang"
                        lang="es"
                        onChange={handleFileChange}
                      />
                      <label className="custom-file-label" htmlFor="customFileLang">
                        {selectedFile ? selectedFile.name : 'Select a file'}
                      </label>
                    </div>
                  </Form.Group>
                  <button
                    disabled={!selectedFile}
                    type="submit"
                    className="btn btn-outline-warning ml-3 btn-sm"
                  >
                    <i className="mdi mdi-upload" /> Upload
                  </button>
                </Form>
              </Collapse>
            </h4>
            <div className="table-responsive">
              {!payment.selectedItem && <Errors errors={payment.errors} />}
              <div className="mb-0 text-muted">Total: {payment.count}</div>
              <table className="table table-hover">
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
                {
                  payment.loading
                    ? <Circles
                      visible
                      width="100%"
                      ariaLabel="ball-triangle-loading"
                      wrapperStyle={{ float: "right" }}
                      color='orange'
                    />
                    : payment.results?.length
                      ? payment.results.map(p =>
                        <tr
                          key={p.id} className="cursor-pointer"
                          onClick={() => dispatch(selectPayment(p.id))}
                        >
                          <td> {p.date} </td>
                          <td> {p.total} </td>
                          <td>
                            <i className={
                              `text-${p.is_prepayment ? "success" : "danger"}
                               mdi mdi-${p.is_prepayment ? 'check' : 'close'}
                               `}
                            />
                          </td>
                          <td> {p.principal} </td>
                          <td> {p.interest} </td>
                          <td> {p.remaining} </td>
                          <td> {p.saved} </td>
                          <td>
                            <i
                              className="mr-2 mdi mdi-pencil text-secondary"
                            />
                          </td>
                        </tr>)
                      : <tr>
                        <td colSpan={6}><span>No payments found</span></td>
                      </tr>
                }
                </tbody>
              </table>
            </div>
            <BottomPagination items={payment} fetchMethod={api.getList} setKwargs={setKwargs} />

          </div>
        </div>
      </div>
    </div>
    <Modal centered show={Boolean(payment.selectedItem)} onHide={() => dispatch(selectPayment())}>
      <Modal.Header closeButton>
        <Modal.Title>
          <div className="row">
            <div className="col-lg-12 grid-margin stretch-card mb-1">
              {payment.selectedItem?.is_prepayment ? "Prepayment" : "Installment"}
            </div>
          </div>
          <p className="text-muted mb-0">{payment.selectedItem?.date}</p>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Errors errors={payment.errors}/>

        {
          payment.loadingItems?.includes(payment.selectedItem?.id)
          ? <ColorRing
              width = "100%"
              height = "50"
              wrapperStyle={{width: "100%"}}
            />
          : <Form
              onSubmit={event => {
                event.preventDefault()
                dispatch(api.update(payment.selectedItem.id, {saved}))
              }}
            >
              <Form.Group className="mb-3">
                <Form.Label>Saved</Form.Label>
                <Form.Control
                  type="text"
                  value={saved}
                  onChange={e => setSaved(e.target.value)}
                />
              </Form.Group>
            </Form>
        }
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => dispatch(selectPayment())}>Close</Button>
        <Button variant="primary" onClick={() =>
          dispatch(api.update(payment.selectedItem.id, {saved}))}
        >
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  </div>
}

export default Payments;
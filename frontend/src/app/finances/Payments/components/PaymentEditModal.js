import React, {useEffect, useState} from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { useDispatch, useSelector } from "react-redux";
import 'ace-builds'
import 'ace-builds/webpack-resolver'

import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";
import { ColorRing } from "react-loader-spinner";
import { FinanceApi } from "../../../../api/finance";
import { selectItem as selectPayment } from "../../../../redux/paymentSlice";
import Form from "react-bootstrap/Form";
import Errors from "../../../shared/Errors";

const PaymentEditModal = () => {
  const dispatch = useDispatch();
  const payment = useSelector(state => state.payment)
  const selectedPayment = useSelector(state => state.payment.selectedItem)
  const token = useSelector((state) => state.auth.token)

  const [saved, setSaved] = useState(null);

  useEffect(() => {
    if (selectedPayment) setSaved(selectedPayment.saved || 0)
  }, [selectedPayment]);
  return <Modal centered show={!!selectedPayment} onHide={() => dispatch(selectPayment())}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card mb-1">
            {selectedPayment?.is_prepayment ? "Prepayment" : "Installment"}
          </div>
        </div>
        <p className="text-muted mb-0">{selectedPayment?.date}</p>
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Errors errors={payment.errors}/>

      {
        payment.loadingItems?.includes(selectedPayment?.id)
        ? <ColorRing
            width = "100%"
            height = "50"
            wrapperStyle={{width: "100%"}}
          />
        : <Form
            onSubmit={event => {
              event.preventDefault()
              dispatch(FinanceApi.updateCreditPayment(token, selectedPayment.id, {saved: saved}))
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
      <Button variant="secondary" onClick={() => dispatch(selectPayment())}>
        Close
      </Button>
      <Button variant="primary" onClick={() => {
        dispatch(FinanceApi.updateCreditPayment(token, selectedPayment.id, {
          saved: saved,
        }))
      }}>
        Save Changes
      </Button>
    </Modal.Footer>
  </Modal>
}
export default PaymentEditModal;
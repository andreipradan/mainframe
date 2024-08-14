import React, {useEffect, useState} from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { useDispatch, useSelector } from 'react-redux';

import { capitalize } from '../../../../utils';
import { TransactionsApi } from '../../../../../api/finance/transactions';
import { Circles } from 'react-loader-spinner';
import Errors from '../../../../shared/Errors';
import { setsAreEqual } from '../../../utils';
import { FinanceApi } from '../../../../../api/finance';

const TransactionsBulkUpdateModal = props => {
  const dispatch = useDispatch()
  const token = useSelector((state) => state.auth.token)
  const accounts = useSelector(state => state.accounts)
  const transactions = useSelector(state => state.transactions)

  useEffect(() => {
    if (props.specificCategoriesModalOpen && !!props.checkedCategories) {
      const checked = new Set(props.checkedCategories.map(c => c.description))
      const extra = new Set(transactions.extra?.results?.map(t => t.description))
      !setsAreEqual(checked, extra) && dispatch(TransactionsApi.bulkUpdateTransactionsPreview(token, props.checkedCategories));
    }
  }, [props.specificCategoriesModalOpen]);

  return <Modal centered show={props.specificCategoriesModalOpen} onHide={() => props.setSpecificCategoriesModalOpen(false)}>
    <Modal.Header closeButton>
      <Modal.Title>
        <div className="row">
          <div className="col-lg-12 grid-margin stretch-card mb-1">
            Update multiple categories?
            {
              transactions.extra?.loading
              ? <Circles height={15} width={15} wrapperStyle={{display: "default"}} wrapperClass="btn" color={"orange"}/>
              : <button
                type="button"
                className="btn btn-outline-success btn-sm border-0 bg-transparent"
                onClick={() => dispatch(TransactionsApi.bulkUpdateTransactionsPreview(token, props.checkedCategories))}
              >
                <i className="mdi mdi-refresh" />
              </button>

            }
          </div>
        </div>
        <p className="text-muted mb-0">Update categories in bulk</p>
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Errors errors={transactions.errors} />
      <p className="mb-0">This will update all <b>Unidentified</b> transactions</p>
      <p>with the descriptions below as follows:</p>
      <ul>
        {
          props.checkedCategories?.map((c, i) => <li key={i}>
            {c.description}<span className="text-warning"> ->&nbsp;</span>
            <span className="text-success">
              {capitalize(c.category).replace('-', ' ')}
              {
                transactions.extra?.loading
                  ? <Circles height={15} width={15} wrapperStyle={{display: "default"}} wrapperClass="btn" color={"orange"}/>
                  : ` [${transactions.extra?.results?.find(t => t.description === c.description)?.count || 0}]`
              }
            </span>
        </li>)
        }
      </ul>
      Proceed?
    </Modal.Body>
    <Modal.Footer>
      <Button variant="success" onClick={() => props.setSpecificCategoriesModalOpen(false)}>No, go back</Button>
      <Button
        disabled={transactions.extra?.loading || !transactions.extra?.results?.length || transactions.extra?.results.map(t => t.count).reduce((partialSum, a) => partialSum + a, 0) <= 0}
        variant="danger"
        onClick={() => {
          dispatch(TransactionsApi.bulkUpdateTransactions(token, props.checkedCategories, transactions.kwargs));
          props.setSpecificCategoriesModalOpen(false);
          dispatch(FinanceApi.getExpenses(token, accounts.selectedItem.id, props.year))
        }}
      >
        Yes, bulk update!
      </Button>
    </Modal.Footer>
  </Modal>;
}
export default TransactionsBulkUpdateModal;
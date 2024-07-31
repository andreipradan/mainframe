import axios from '../index';
import { handleErrors } from '../errors';
import { toast } from 'react-toastify';
import { toastParams } from '../auth';
import { createSearchParams } from '../finance';

import {
  deleteItem as deleteTransaction,
  set,
  setItem,
  setErrors,
  setExtra,
  setLoading,
  setLoadingItems,
  update,
  setKwargs,
} from '../../redux/transactionsSlice';

export class TransactionsApi {
  static bulkUpdateTransactions = (token, data, kwargs) => dispatch => {
    dispatch(setLoading(true))
    axios
      .put(`${base}/bulk-update/?${createSearchParams(kwargs)}`,
        data,
        { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors))
  }
  static bulkUpdateTransactionsPreview = (token, data) => dispatch => {
    dispatch(setExtra({ loading: true }))
    axios
      .put(`${base}/bulk-update-preview/`,
        data,
        { headers: { Authorization: token } })
      .then((response) => {
        dispatch(setExtra({ loading: false, results: response.data }));
      })
      .catch((err) => {
        dispatch(setExtra({loading: false}))
        handleErrors(err, dispatch, setErrors);
      })
  }
  static delete = (token, id) => dispatch => {
    dispatch(setLoadingItems(id));
    axios
      .delete(`${base}/${id}/`, { headers: { Authorization: token } })
      .then(() => dispatch(deleteTransaction(id)))
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
  static get = (token, transactionId) => dispatch => {
    dispatch(setLoadingItems(transactionId));
    axios
      .get(`${base}/${transactionId}/`, { headers: { Authorization: token } })
      .then((response) => dispatch(setItem(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getList = (token, kwargs = null) => (dispatch) => {
    dispatch(setLoading(true));
    kwargs = kwargs || {};
    axios
      .get(`${base}/?${createSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static update = (token, id, data, updateCategory = false) => dispatch => {
    dispatch(setLoading(true))
    data.confirmed_by = data.category === "Unidentified" ? 0 : 1
    axios
      .patch(`${base}/${id}/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(update(response.data));
        if (updateCategory) dispatch(setKwargs({ category: data.category }))
        toast.success("Transaction updated successfully!", toastParams)
      })
      .catch((err) => handleErrors(err, dispatch, setErrors))
  }
  static updateAll = (token, data, kwargs) => dispatch => {
    dispatch(setLoading(true))
    axios
      .put(`${base}/update-all/?${createSearchParams(kwargs)}`,
        data,
        { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors))
  }

  static uploadTransactions = (token, data, kwargs) => dispatch => {
    dispatch(setLoading(true))
    kwargs = kwargs || {};
    axios.post(
      `${base}/upload/?${createSearchParams(kwargs)}`,
      data,
      {headers: {Authorization: token, 'Content-Type': 'multipart/form-data'}}
    )
    .then((response) => {
      dispatch(set(response.data));
      toast.success("Payments uploaded successfully!", toastParams)

    })
    .catch((err) => handleErrors(err, dispatch, setErrors));
  }
}
let base = "finance/transactions";

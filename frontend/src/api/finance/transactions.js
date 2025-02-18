import axios from '../index';
import { handleErrors } from '../errors';
import { toast } from 'react-toastify';
import { toastParams } from '../auth';
import { createSearchParams, DeleteApi, DetailApi, ListApi, mix, TokenMixin } from '../shared';

import {
  deleteItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setExtra,
  setLoading,
  setLoadingItems,
  update,
  setKwargs,
} from '../../redux/transactionsSlice';

export class TransactionsApi extends mix(DeleteApi, DetailApi, ListApi, TokenMixin) {
  static baseUrl = "finance/transactions"
  static methods = {
    delete: deleteItem,
    set,
    setCompletedLoadingItem,
    setErrors,
    setLoading,
    setLoadingItems,
  }
  static bulkUpdateTransactions = (token, data, kwargs) => dispatch => {
    dispatch(setLoading(true))
    axios
      .put(`${base}/bulk-update/?${createSearchParams(kwargs)}`,
        data,
        { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors, setLoading))
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
      .catch((err) => handleErrors(err, dispatch, setErrors, setLoading))
  }
  static updateAll = (token, data, kwargs) => dispatch => {
    dispatch(setLoading(true))
    axios
      .put(`${base}/update-all/?${createSearchParams(kwargs)}`,
        data,
        { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors, setLoading))
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
    .catch((err) => handleErrors(err, dispatch, setErrors, setLoading));
  }
}
let base = "finance/transactions";

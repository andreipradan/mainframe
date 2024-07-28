import { toast } from 'react-toastify';
import axios from '../index';
import { toastParams } from '../auth';
import { handleErrors } from '../errors';

import {
  create,
  selectItem,
  set,
  setItem,
  setErrors,
  setLoading,
  setModalOpen,
  update,
} from '../../redux/accountsSlice';

export class AccountsApi {
  static create = (token, data, modalOpen) => dispatch => {
    dispatch(setLoading(true));
    axios
      .post(`${base}/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(create({ dontClearSelectedItem: true, ...response.data }));
        toast.success("Account created successfully!", toastParams)
      })
      .catch((err) => {
        handleErrors(err, dispatch, setErrors);
        dispatch(setModalOpen(modalOpen))
      });
  }
  static get = (token, accountId) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/${accountId}/`, { headers: { Authorization: token } })
      .then(response => dispatch(setItem(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getList = (token, initial = false) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/`, { headers: { Authorization: token } })
      .then(response => {
        dispatch(set(response.data));
        if (initial) dispatch(selectItem(response.data.results[0].id))
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };

  static update = (token, id, data, modalOpen) => dispatch => {
    dispatch(setLoading(true))
    axios
      .patch(`${base}/${id}/`, data, { headers: { Authorization: token } })
      .then(response => {
        dispatch(setItem(response.data));
        toast.success("Account updated successfully!", toastParams)
      })
      .catch((err) => {
        dispatch(setModalOpen(modalOpen))
        handleErrors(err, dispatch, setErrors);
      })
  }
}
let base = "finance/accounts";

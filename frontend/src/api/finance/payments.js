import axios from '../index';
import { handleErrors } from '../errors';
import { createSearchParams } from '../finance';

import {
  set,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from '../../redux/paymentSlice';
import { toast } from 'react-toastify';
import { toastParams } from '../auth';

export class PaymentsApi {
  static getList = (token, kwargs = null) => (dispatch) => {
    kwargs = kwargs || {}
    dispatch(setLoading(true));
    axios
      .get(`${base}/?${createSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static update = (token, id, data) => dispatch => {
    dispatch(setLoadingItems(id))
    axios
      .patch(`${base}/payments/${id}/`, data, { headers: { Authorization: token } })
      .then((response) => dispatch(update(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors))
  };

  static upload = (token, data) => dispatch => {
    dispatch(setLoading(true))
    axios.post(
      `${base}/`,
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
const base = "finance/payments"

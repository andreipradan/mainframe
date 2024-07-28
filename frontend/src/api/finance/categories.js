import axios from '../index';
import { handleErrors } from '../errors';
import { toast } from 'react-toastify';
import { toastParams } from '../auth';

import {
  create,
  set,
  setErrors,
  setLoading,
} from '../../redux/categoriesSlice';

export class CategoriesApi {
  static create = (token, data) => dispatch => {
    dispatch(setLoading(true));
    axios
      .post(`${base}/`, data, { headers: { Authorization: token } })
      .then(response => {
        dispatch(create({ setSelected: true, ...response.data }));
        toast.success(`Category ${data.id} created successfully!`, toastParams)
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  }
  static getList = token => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/`, { headers: { Authorization: token } })
      .then(response => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };

}
let base = "finance/categories";

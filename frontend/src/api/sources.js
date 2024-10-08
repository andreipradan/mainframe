import axios from "./index";
import {
  create,
  deleteItem,
  set,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from '../redux/sourcesSlice';
import { handleErrors } from "./errors";
import { toast } from 'react-toastify';
import { toastParams } from './auth';


class SourcesApi {
  static create = (token, data) => dispatch => {
    dispatch(setLoading(true))
    axios
      .post(`${base}/`, data, { headers: { Authorization: token} })
      .then(response => dispatch(create(response.data)))
      .catch(err => handleErrors(err, dispatch, setErrors))
  }
  static delete = (token, source) => dispatch => {
    dispatch(setLoading(true))
    axios
      .delete(`${base}/${source.id}/`, { headers: { Authorization: token }})
      .then(() => {
        dispatch(deleteItem(source.id));
        toast.warning(`Source '${source.name} (${source.url})' deleted`, toastParams)

      })
      .catch(err => handleErrors(err, dispatch, setErrors))
  }
  static getList = token => dispatch => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/`, { headers: { Authorization: token } })
      .then(response => dispatch(set(response.data)))
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
  static update = (token, id, data) => dispatch => {
    dispatch(setLoadingItems(id))
    axios
      .put(`${base}/${id}/`, data, { headers: { Authorization: token}})
      .then(response => dispatch(update(response.data)))
      .catch(err => handleErrors(err, dispatch, setErrors))
  }
}

const base = "sources";

export default SourcesApi;

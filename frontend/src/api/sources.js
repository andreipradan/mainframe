import axios from "./index";
import {
  create,
  set,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from '../redux/sourcesSlice';
import { handleErrors } from "./errors";


class SourcesApi {
  static create = (token, data) => dispatch => {
    dispatch(setLoading(true))
    axios
      .post(`${base}/`, data, { headers: { Authorization: token} })
      .then(response => dispatch(create(response.data)))
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

let base = "sources";

export default SourcesApi;

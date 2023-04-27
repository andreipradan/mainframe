import axios from "./index";
import {
  create,
  deleteCron,
  set,
  setErrors,
  setLoading,
  setLoadingCron,
  update,
} from "../redux/cronsSlice";
import {handleErrors} from "./errors";


class CronsApi {
  static create = (token, data) => dispatch => {
    dispatch(setLoading(true));
    axios
      .post(`${base}/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(create(response.data));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static delete = (token, cronId) => dispatch => {
    dispatch(setLoadingCron(cronId));
    axios
      .delete(`${base}/${cronId}/`, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(deleteCron(cronId));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getList = (token, page = null) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static sync = token => dispatch => {
    dispatch(setLoading(true));
    axios
      .put(`${base}/sync/`, {}, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static updateCron = (token, cronId, data) => dispatch => {
    dispatch(setLoadingCron(cronId));
    axios
      .patch(`${base}/${cronId}/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(update(response.data));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

let base = "crons";

export default CronsApi;

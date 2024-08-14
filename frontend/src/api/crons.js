import { axios, ngrokAxios } from "./index";
import {
  create,
  deleteCron,
  set,
  setErrors,
  setLoading,
  setLoadingCron,
  update,
} from "../redux/cronsSlice";
import { handleErrors } from "./errors";
import { toast } from "react-toastify";
import { toastParams } from "./auth";


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
      .then(() => dispatch(deleteCron(cronId)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getList = (token, page = null) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static kill = (token, cronId, cronCommand) => dispatch => {
    dispatch(setLoading(true));
    ngrokAxios
      .put(`${base}/${cronId}/kill/`, {}, { headers: { Authorization: token } })
      .then(() => dispatch(setErrors([`Process ${cronCommand} killed`])))
      .catch((err) => {
        if (err.response?.status === 404)
          return dispatch(setErrors([`Process ${cronCommand} does not exist`]))
        return handleErrors(err, dispatch, setErrors)
      });
  };
  static run = (token, cronId, cronCommand) => dispatch => {
    dispatch(setLoading(true));
    ngrokAxios
      .put(`${base}/${cronId}/run/`, {}, { headers: { Authorization: token } })
      .then(() => {
        toast.success(`"${cronCommand}" executed successfully!`, toastParams)
        dispatch(setLoading(false))
      })
      .catch((err) => {
        if (err.response?.status === 404)
          return dispatch(setErrors([`Process ${cronCommand} does not exist`]))
        return handleErrors(err, dispatch, setErrors)
      });
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

import axios from "./index";
import {
  add,
  remove,
  set,
  setErrors,
  setLoading,
  setLoadingBots,
  update,
} from "../redux/botsSlice";
import {handleErrors} from "./errors";


class BotsApi {
  static clearWebhook = (token, botId) => (dispatch) => {
    dispatch(setLoadingBots(botId));
    axios
      .put(`${base}${botId}/clear-webhook/`, {}, { headers: { Authorization: token } })
      .then((response) => dispatch(update(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static delete = (token, botId) => (dispatch) => {
    axios
      .delete(`${base}${botId}/`, { headers: { Authorization: token } })
      .then(() => {dispatch(remove(botId))})
      .catch((err) => handleErrors(err, dispatch));
  };
  static getList = (token) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(base, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static postNewBot = (token, data) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .post(base, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(add(response.data));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static updateBot = (token, botId, data) => (dispatch) => {
    dispatch(setLoadingBots(botId));
    axios
      .patch(`${base}${botId}/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(update(response.data));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static sync = (token, botId) => (dispatch) => {
    dispatch(setLoadingBots(botId));
    axios
      .put(`${base}${botId}/sync/`, {}, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(update(response.data));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

let base = "bots/";

export default BotsApi;

import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
  setLoadingBots,
  update,
} from "../redux/botsSlice";

import {handleErrors} from "./errors";


class BotsApi {
  static getList = token => dispatch => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getItem = (token, botId) => dispatch => {
    dispatch(setLoadingBots(botId));
    axios
      .get(`${base}/${botId}/`, { headers: { Authorization: token } })
      .then((response) => dispatch(update(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static updateBot = (token, botId, data) => dispatch => {
    dispatch(setLoadingBots(botId));
    axios
      .patch(`${base}/${botId}/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(update(response.data));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static sync = (token, botId) => dispatch => {
    dispatch(setLoadingBots(botId));
    axios
      .put(`${base}/${botId}/sync/`, {}, { headers: { Authorization: token } })
      .then((response) => dispatch(update(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

const base = "telegram/bots";

export default BotsApi;

import axios from "./index";
import {
  create,
  set,
  setErrors,
  setLoading,
  setLoadingItems as setLoadingBots,
  update,
} from "../redux/botsSlice";

import {handleErrors} from "./errors";


class BotsApi {
  static create = (token, data) => dispatch => {
    dispatch(setLoading(true))
    axios
      .post(`${base}/`, data, { headers: {Authorization: token} })
      .then(response => {
        dispatch(create(response.data))
      })
      .catch(err => handleErrors(err, dispatch, setErrors))
  }
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

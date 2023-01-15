import axios from "./index";
import {
  add,
  remove,
  select,
  set,
  setErrors,
  setLoading,
  setLoadingBots,
  update,
} from "../redux/botsSlice";

const handleErrors = async (err, dispatch) => {
  if (err.response) {
    const contentType = err.response.headers["content-type"];
    if (!contentType.startsWith("application/json"))
      return dispatch(setErrors([`Unexpected response [${err.response.statusText}]`]));
  }
  if (err.response?.data) {
    if (err.response.data["msg"] === "User is not logged on.") {
      localStorage.clear();
    }
    dispatch(
      setErrors(
        Object.keys(err.response.data).map((k) => {
          let errors = err.response.data[k];
          return `${k}: ${Array.isArray(errors) ? err.response.data[k].join(", ") : errors}`;
        })
      )
    );
  } else {
    dispatch(
      setErrors([`Something went wrong [${err.response?.status || err.response || err.message}]`])
    );
  }
};

class BotsApi {
  static clearWebhook = (token, botId) => (dispatch) => {
    dispatch(setLoadingBots(botId));
    axios
      .put(`${base}${botId}/clear-webhook/`, {}, { headers: { Authorization: token } })
      .then((response) => dispatch(update(response.data)))
      .catch((err) => handleErrors(err, dispatch));
  };
  static delete = (token, botId) => (dispatch) => {
    axios
      .delete(`${base}${botId}/`, { headers: { Authorization: token } })
      .then(() => {
        dispatch(remove(botId));
        dispatch(select(null));
      })
      .catch((err) => handleErrors(err, dispatch));
  };
  static getList = (token) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(base, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch));
  };
  static postNewBot = (token, data) => (dispatch) => {
    axios
      .post(base, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(add(response.data));
        dispatch(select(null));
      })
      .catch((err) => handleErrors(err, dispatch));
  };
  static updateBot = (token, botId, data) => (dispatch) => {
    axios
      .patch(`${base}${botId}/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(update(response.data));
        dispatch(select(null));
      })
      .catch((err) => handleErrors(err, dispatch));
  };
  static sync = (token, botId) => (dispatch) => {
    dispatch(setLoadingBots(botId));
    axios
      .put(`${base}${botId}/sync/`, {}, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(update(response.data));
      })
      .catch((err) => handleErrors(err, dispatch));
  };
}

let base = "bots/";

export default BotsApi;

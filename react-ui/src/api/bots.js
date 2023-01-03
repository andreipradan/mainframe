import axios from "./index";
import { add, remove, set, setErrors, update } from "../redux/botsSlice";

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
    dispatch(setErrors(Object.keys(err.response.data).map((k) => `${k}: ${err.response.data[k]}`)));
  } else {
    dispatch(setErrors([`Something went wrong [${err.response?.status}]`]));
  }
};

class BotsApi {
  static delete = (token, botId) => (dispatch) => {
    axios
      .delete(`${base}${botId}`, { headers: { Authorization: token } })
      .then(() => dispatch(remove(botId)))
      .catch((err) => handleErrors(err, dispatch));
  };
  static getList = (token, dispatch) => {
    axios
      .get(base, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch));
  };
  static postNewBot = (token, data) => (dispatch) => {
    axios
      .post(base, data, { headers: { Authorization: token } })
      .then((response) => dispatch(add(response.data)))
      .catch((err) => handleErrors(err, dispatch));
  };

  static updateBot = (token, botId, data) => (dispatch) => {
    axios
      .put(`${base}${botId}`, data, { headers: { Authorization: token } })
      .then((response) => dispatch(update({ botId: botId, data: response.data })))
      .catch((err) => handleErrors(err, dispatch));
  };
}

let base = "bots/";

export default BotsApi;

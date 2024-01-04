import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
  setLoadingItems,
  update
} from "../redux/messagesSlice"

import { handleErrors } from "./errors";

class MessagesApi {
  static getList = token => dispatch => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/`, { headers: { Authorization: token } })
      .then(response => dispatch(set(response.data)))
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
  static getItem = (token, messageId) => dispatch => {
    dispatch(setLoadingItems(messageId));
    axios
      .get(`${base}/${messageId}/`, { headers: { Authorization: token } })
      .then(response => dispatch(update(response.data)))
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
  static updateBot = (token, messageId, data) => dispatch => {
    dispatch(setLoadingItems(messageId));
    axios
      .patch(`${base}/${messageId}/`, data, { headers: { Authorization: token } })
      .then(response => dispatch(update(response.data)))
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
}

let base = "telegram/messages";

export default MessagesApi;

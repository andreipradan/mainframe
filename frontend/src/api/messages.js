import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
} from "../redux/messagesSlice"

import { handleErrors } from "./errors";
import {createSearchParams} from "./shared";

class MessagesApi {
  static getList = (token, kwargs) => dispatch => {
    dispatch(setLoading(true));
    kwargs = kwargs || {};
    axios
      .get(`${base}/` + `?${createSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then(response => dispatch(set(response.data)))
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
}

let base = "telegram/messages";

export default MessagesApi;

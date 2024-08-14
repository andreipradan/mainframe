import axios from "./index";
import {
  set, setCurrentLog,
  setErrors,
  setLoading,
} from "../redux/logsSlice";
import {handleErrors} from "./errors";


class LogsApi {
  static getList = (token, path=null) => dispatch => {
    dispatch(setLoading(true));
    axios
      .get(base + (path ? `?path=${path}` : ""), { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getFile = (token, filename) => dispatch => {
    dispatch(setLoading(true));
    axios
      .get(`${base}?filename=${filename}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setCurrentLog({contents: response.data, name: filename})))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

const base = "logs/";

export default LogsApi;

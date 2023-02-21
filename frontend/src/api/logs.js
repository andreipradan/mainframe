import axios from "./index";
import {
  set,
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
}

let base = "logs/";

export default LogsApi;

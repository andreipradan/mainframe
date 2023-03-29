import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
  setOverview,
} from "../redux/transactionsSlice";
import {handleErrors} from "./errors";


class TransactionsApi {
  static getOverview = token => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(base + `overview/`, { headers: { Authorization: token } })
      .then((response) => dispatch(setOverview(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getList = (token, page = null) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(base + `?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

let base = "transactions/";

export default TransactionsApi;

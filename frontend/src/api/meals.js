import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
} from "../redux/mealsSlice";
import {handleErrors} from "./errors";


class MealsApi {
  static getList = (token, startDate, endDate) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(base + `/?start_date=${startDate}&end_date=${endDate}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static sync = token => dispatch => {
    dispatch(setLoading(true));
    axios
      .put(`${base}/sync/`, {}, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

const base = "meals";

export default MealsApi;

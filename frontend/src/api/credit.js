import axios from "./index";
import {
  deleteTimetable,
  set,
  setErrors,
  setLoading,
  setOverview,
} from "../redux/creditSlice";
import {handleErrors} from "./errors";


class CreditApi {
  static deleteTimetable = (token, timetableId) => (dispatch) => {
    axios
      .delete(`${base}timetables/${timetableId}/`, { headers: { Authorization: token } })
      .then(() => {dispatch(deleteTimetable(timetableId))})
      .catch((err) => handleErrors(err, dispatch));
  };
  static getList = (token, page = null) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(base + `?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getOverview = token => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(base, { headers: { Authorization: token } })
      .then((response) => dispatch(setOverview(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

let base = "credit/";

export default CreditApi;

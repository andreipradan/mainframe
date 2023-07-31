import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
} from "../redux/creditSlice";
import {
  set as setPayments,
  setErrors as setPaymentErrors,
  setLoading as setPaymentLoading,
  setLoadingPayments,
  update,
} from "../redux/paymentSlice";
import {
  deleteTimetable,
  set as setTimetables,
  setErrors as setTimetableErrors,
  setLoading as setTimetableLoading,
} from "../redux/timetableSlice";
import {handleErrors} from "./errors";


class CreditApi {
  static deleteTimetable = (token, timetableId) => (dispatch) => {
    axios
      .delete(`${base}timetables/${timetableId}/`, { headers: { Authorization: token } })
      .then(() => {dispatch(deleteTimetable(timetableId))})
      .catch((err) => handleErrors(err, dispatch));
  };
  static getOverview = token => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(base, { headers: { Authorization: token } })
      .then(response => {dispatch(set(response.data))})
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getPayments = (token, page = null) => (dispatch) => {
    dispatch(setPaymentLoading(true));
    axios
      .get(`${base}payments/` + `?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setPayments(response.data)))
      .catch((err) => handleErrors(err, dispatch, setPaymentErrors));
  };
  static getTimetables = (token, page = null) => (dispatch) => {
    dispatch(setTimetableLoading(true));
    axios
      .get(`${base}timetables/` + `?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setTimetables(response.data)))
      .catch((err) => handleErrors(err, dispatch, setTimetableErrors));
  };
  static updatePayment = (token, id, data) => dispatch => {
    dispatch(setLoadingPayments(id))
    axios
      .patch(`${base}payments/${id}/`, data, { headers: { Authorization: token } })
      .then((response) => dispatch(update(response.data)))
      .catch((err) => handleErrors(err, dispatch, setPaymentErrors))
  }
}

let base = "credit/";

export default CreditApi;

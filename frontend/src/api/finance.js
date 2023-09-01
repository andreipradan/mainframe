import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
} from "../redux/creditSlice";
import {
  create as createAccount,
  set as setAccounts,
  setAnalytics,
  setErrors as setAccountsErrors,
  setLoading as setAccountsLoading,
  setLoadingAccounts,
  update as updateAccount,
} from "../redux/accountsSlice";
import {
  create as createCategory,
  set as setCategories,
  setErrors as setCategoriesErrors,
  setLoading as setCategoriesLoading,
} from "../redux/categoriesSlice";
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
import {
  set as setTransactions,
  setErrors as setTransactionsErrors,
  setLoading as setTransactionsLoading,
  setLoadingTransactions,
  updateTransaction,
} from "../redux/transactionsSlice";
import {handleErrors} from "./errors";


class FinanceApi {
  static createAccount = (token, data) => dispatch => {
    dispatch(setLoadingAccounts(true));
    axios
      .post(`${base}/accounts/`, data, { headers: { Authorization: token } })
      .then((response) => dispatch(createAccount(response.data)))
      .catch((err) => handleErrors(err, dispatch, setAccountsErrors));
  }
  static createCategory = (token, data) => dispatch => {
    dispatch(setCategoriesLoading(true));
    axios
      .post(`${base}/categories/`, data, { headers: { Authorization: token } })
      .then((response) => dispatch(createCategory(response.data)))
      .catch((err) => handleErrors(err, dispatch, setCategoriesErrors));
  }
  static deleteTimetable = (token, timetableId) => (dispatch) => {
    axios
      .delete(`${base}/timetables/${timetableId}/`, { headers: { Authorization: token } })
      .then(() => {dispatch(deleteTimetable(timetableId))})
      .catch((err) => handleErrors(err, dispatch));
  };
  static getAccount = (token, accountId) => (dispatch) => {
    dispatch(setAccountsLoading(true));
    axios
      .get(`${base}/accounts/`, { headers: { Authorization: token } })
      .then(response => dispatch(setAccounts({accountId: parseInt(accountId), ...response.data})))
      .catch((err) => handleErrors(err, dispatch, setAccountsErrors));
  };
  static getAccounts = token => (dispatch) => {
    dispatch(setAccountsLoading(true));
    axios
      .get(`${base}/accounts/`, { headers: { Authorization: token } })
      .then(response => dispatch(setAccounts(response.data)))
      .catch((err) => handleErrors(err, dispatch, setAccountsErrors));
  };
  static getAnalytics = (token, accountId, year = null) => dispatch => {
    dispatch(setAccountsLoading(true));
    let url = `${base}/accounts/${accountId}/analytics/`
    if (year) url += `?year=${year}`
    axios
      .get(url, { headers: { Authorization: token } })
      .then(response => dispatch(setAnalytics(response.data)))
      .catch((err) => handleErrors(err, dispatch, setAccountsErrors));
  };
  static getCategories = token => (dispatch) => {
    dispatch(setCategoriesLoading(true));
    axios
      .get(`${base}/categories/`, { headers: { Authorization: token } })
      .then(response => dispatch(setCategories(response.data)))
      .catch((err) => handleErrors(err, dispatch, setCategoriesErrors));
  };
  static getCredit = token => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/credit/`, { headers: { Authorization: token } })
      .then(response => {dispatch(set(response.data))})
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getCreditPayments = (token, page = null) => (dispatch) => {
    dispatch(setPaymentLoading(true));
    axios
      .get(`${base}/payments/` + `?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setPayments(response.data)))
      .catch((err) => handleErrors(err, dispatch, setPaymentErrors));
  };
  static getCreditTimetables = (token, page = null) => (dispatch) => {
    dispatch(setTimetableLoading(true));
    axios
      .get(`${base}/timetables/?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setTimetables(response.data)))
      .catch((err) => handleErrors(err, dispatch, setTimetableErrors));
  };
  static getTransaction = (token, transactionId) => dispatch => {
    dispatch(setLoadingTransactions(transactionId));
    axios
      .get(`${base}/transactions/${transactionId}/`, { headers: { Authorization: token } })
      .then((response) => dispatch(updateTransaction(response.data)))
      .catch((err) => handleErrors(err, dispatch, setTransactionsErrors));
  };
  static getTransactions = (token, kwargs = null) => (dispatch) => {
    dispatch(setTransactionsLoading(true));
    kwargs = kwargs || {};
    axios
      .get(`${base}/transactions/?${new URLSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setTransactions(response.data)))
      .catch((err) => handleErrors(err, dispatch, setTransactionsErrors));
  };
  static updateAccount = (token, id, data) => dispatch => {
    dispatch(setLoadingAccounts(id))
    axios
      .patch(`${base}/accounts/${id}/`, data, { headers: { Authorization: token } })
      .then((response) => dispatch(updateAccount(response.data)))
      .catch((err) => handleErrors(err, dispatch, setAccountsErrors))
  }
  static updateCreditPayment = (token, id, data) => dispatch => {
    dispatch(setLoadingPayments(id))
    axios
      .patch(`${base}/payments/${id}/`, data, { headers: { Authorization: token } })
      .then((response) => dispatch(update(response.data)))
      .catch((err) => handleErrors(err, dispatch, setPaymentErrors))
  };
  static updateTransaction = (token, id, data) => dispatch => {
    dispatch(setTransactionsLoading(true))
    axios
      .patch(`${base}/transactions/${id}/`, data, { headers: { Authorization: token } })
      .then((response) => dispatch(updateTransaction(response.data)))
      .catch((err) => handleErrors(err, dispatch, setAccountsErrors))
  }
}

let base = "finance";

export default FinanceApi;

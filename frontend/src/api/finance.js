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
  clearAccuracy,
  set as setTransactions,
  setErrors as setTransactionsErrors,
  setLoading as setTransactionsLoading,
  setLoadingTransactions,
  updateTransaction,
} from "../redux/transactionsSlice";
import {handleErrors} from "./errors";

const createSearchParams = params => {
  return new URLSearchParams(
    Object.entries(params).flatMap(([key, values]) =>
      Array.isArray(values)
        ? values.map((value) => [key, value])
        : [[key, values]]
    )
  )
}

class FinanceApi {
  static bulkUpdateTransactions = (token, data, kwargs) => dispatch => {
    dispatch(setTransactionsLoading(true))
    axios
      .put(`${base}/transactions/bulk-update/?${createSearchParams(kwargs)}`,
        data,
        { headers: { Authorization: token } })
      .then((response) => dispatch(setTransactions(response.data)))
      .catch((err) => handleErrors(err, dispatch, setTransactionsErrors))
  }
  static clearSuggestions = (token, data) => dispatch => {
    dispatch(setTransactionsLoading(true))
    axios
      .put(`${base}/transactions/clear-suggestions/`, data, {headers: {Authorization: token}})
      .then(response => dispatch(setTransactions(response.data)))
      .catch(err => handleErrors(err, dispatch, setTransactionsErrors))
  }
  static createAccount = (token, data) => dispatch => {
    dispatch(setLoadingAccounts(true));
    axios
      .post(`${base}/accounts/`, data, { headers: { Authorization: token } })
      .then((response) => dispatch(createAccount(response.data)))
      .catch((err) => handleErrors(err, dispatch, setAccountsErrors));
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
      .get(`${base}/transactions/?${createSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setTransactions(response.data)))
      .catch((err) => handleErrors(err, dispatch, setTransactionsErrors));
  };
  static predict = (token, data, kwargs) => dispatch => {
    dispatch(setTransactionsLoading(true))
    axios
      .put(`${base}/transactions/predict/?${createSearchParams(kwargs)}`, data, {headers: {Authorization: token}})
      .then(response => dispatch(setTransactions(response.data)))
      .catch(err => handleErrors(err, dispatch, setTransactionsErrors))
  }
  static train = (token, kwargs) => dispatch => {
    dispatch(setTransactionsLoading(true))
    dispatch(clearAccuracy())
    axios
      .put(`${base}/transactions/train/?${createSearchParams(kwargs)}`, {}, {headers: {Authorization: token}})
      .then(response => dispatch(setTransactions(response.data)))
      .catch(err => handleErrors(err, dispatch, setTransactionsErrors))
  }
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
    data.confirmed_by = data.category === "Unidentified" ? 0 : 1
    axios
      .patch(`${base}/transactions/${id}/`, data, { headers: { Authorization: token } })
      .then((response) => dispatch(updateTransaction(response.data)))
      .catch((err) => handleErrors(err, dispatch, setTransactionsErrors))
  }
  static updateTransactions = (token, data, kwargs) => dispatch => {
    dispatch(setTransactionsLoading(true))
    axios
      .put(`${base}/transactions/update-all/?${createSearchParams(kwargs)}`,
        data,
        { headers: { Authorization: token } })
      .then((response) => dispatch(setTransactions(response.data)))
      .catch((err) => handleErrors(err, dispatch, setTransactionsErrors))
  }
}

let base = "finance";

export default FinanceApi;

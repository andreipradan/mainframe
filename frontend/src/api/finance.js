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
  selectItem as selectAccount,
  setModalOpen,
  update as updateAccount,
} from '../redux/accountsSlice';
import {
  set as setCategories,
  setErrors as setCategoriesErrors,
  setLoading as setCategoriesLoading,
} from "../redux/categoriesSlice";
import {
  set as setPayments,
  setErrors as setPaymentErrors,
  setLoading as setPaymentLoading,
  setLoadingItems as setLoadingPayments,
  update,
} from "../redux/paymentSlice";
import {
  set as setPnl,
  setErrors as setPnlErrors,
  setLoading as setPnlLoading,
} from "../redux/pnlSlice";
import {
  set as setStocks,
  setErrors as setStocksErrors,
  setLoading as setStocksLoading,
} from "../redux/stocksSlice";
import {
  create as createTimetable,
  deleteItem as deleteTimetable,
  set as setTimetables,
  setErrors as setTimetableErrors,
  setItem as setTimetable,
  setLoading as setTimetablesLoading,
  setLoadingItems as setTimetableLoading
} from "../redux/timetableSlice";
import {
  deleteItem as deleteTransaction,
  set as setTransactions,
  setExtra as setTransactionExtra,
  setErrors as setTransactionsErrors,
  setLoading as setTransactionsLoading,
  setLoadingItems as setLoadingTransactions,
  update as updateTransaction,
} from "../redux/transactionsSlice";
import {
  set as setPredictionResults,
  setErrors as setPredictionErrors,
  setLoading as setPredictionLoading,
  setLoadingTask,
  setTask,
} from "../redux/predictionSlice"
import {handleErrors} from "./errors";
import { toast } from 'react-toastify';
import { toastParams } from './auth';

export const createSearchParams = params => {
  if (params === null) return ""
  return new URLSearchParams(
    Object.entries(params).flatMap(([key, values]) =>
      Array.isArray(values)
        ? values.map((value) => [key, value])
        : [[key, values]]
    )
  )
}

export class FinanceApi {
  static createAccount = (token, data, modalOpen) => dispatch => {
    dispatch(setAccountsLoading(true));
    axios
      .post(`${base}/accounts/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(createAccount({ dontClearSelectedItem: true, ...response.data }));
        toast.success("Account created successfully!", toastParams)
      })
      .catch((err) => {
        handleErrors(err, dispatch, setAccountsErrors);
        dispatch(setModalOpen(modalOpen))
      });
  }
  static getAccount = (token, accountId) => (dispatch) => {
    dispatch(setAccountsLoading(true));
    axios
      .get(`${base}/accounts/`, { headers: { Authorization: token } })
      .then(response => dispatch(setAccounts({accountId: parseInt(accountId), ...response.data})))
      .catch((err) => handleErrors(err, dispatch, setAccountsErrors));
  };
  static getAccounts = (token, initial = false) => (dispatch) => {
    dispatch(setAccountsLoading(true));
    axios
      .get(`${base}/accounts/`, { headers: { Authorization: token } })
      .then(response => {
        dispatch(setAccounts(response.data));
        if (initial) dispatch(selectAccount(response.data.results[0].id))
      })
      .catch((err) => handleErrors(err, dispatch, setAccountsErrors));
  };
  static getExpenses = (token, accountId, year) => dispatch => {
    dispatch(setAccountsLoading(true));
    let url = `${base}/accounts/${accountId}/expenses/?year=${year}`
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
  static getCreditPayments = (token, kwargs = null) => (dispatch) => {
    kwargs = kwargs || {}
    dispatch(setPaymentLoading(true));
    axios
      .get(`${base}/payments/?${createSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setPayments(response.data)))
      .catch((err) => handleErrors(err, dispatch, setPaymentErrors));
  };
  static importPayments = (token, data) => dispatch => {
    dispatch(setLoading(true))
    axios.post(
      `${base}/payments/`,
      data,
      {headers: {Authorization: token, 'Content-Type': 'multipart/form-data'}}
    )
    .then((response) => {
      dispatch(setPayments(response.data));
      toast.success("Payments uploaded successfully!", toastParams)

    })
    .catch((err) => handleErrors(err, dispatch, setPaymentErrors));
  }
  static updateAccount = (token, id, data, modalOpen) => dispatch => {
    dispatch(setAccountsLoading(true))
    axios
      .patch(`${base}/accounts/${id}/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(updateAccount(
          { dontClearSelectedItem: true, ...response.data },
        ));
        toast.success("Account updated successfully!", toastParams)
      })
      .catch((err) => {
        dispatch(setModalOpen(modalOpen))
        handleErrors(err, dispatch, setAccountsErrors);
      })
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

export class PredictionApi {
  static getTask = (token, type, updateLoading = true) => dispatch => {
    if (updateLoading)
      dispatch(setLoadingTask({type: type, loading: true}))
    axios
      .get(`${base}/prediction/${type}-status/`, { headers: { Authorization: token } })
      .then((response) => dispatch(setTask({type: type, data: response.data, updateLoading: updateLoading})))
      .catch((err) => handleErrors(err, dispatch, setPredictionErrors));
  };
  static getTasks = token => dispatch => {
    dispatch(setPredictionLoading(true))
    axios
      .get(`${base}/prediction/`, { headers: { Authorization: token } })
      .then((response) => dispatch(setPredictionResults(response.data)))
      .catch((err) => handleErrors(err, dispatch, setPredictionErrors));
  };
  static predict = (token, data) => dispatch => {
    dispatch(setLoadingTask({type: "predict", loading: true}))
    axios
      .put(`${base}/prediction/start-prediction/`, data, {headers: {Authorization: token}})
      .then(response => dispatch(setTask({type: "predict", data: response.data})))
      .catch(err => handleErrors(err, dispatch, setPredictionErrors))
  }
  static train = token => dispatch => {
    dispatch(setLoadingTask({type: "train", loading: true}))
    axios
      .put(`${base}/prediction/start-training/`, {}, {headers: {Authorization: token}})
      .then(response => dispatch(setTask({type: "train", data: response.data})))
      .catch(err => handleErrors(err, dispatch, setPredictionErrors))
  }
}

export class PnlApi {
  static getList = (token, kwargs = null) => dispatch => {
    dispatch(setPnlLoading(true));
    axios
      .get(`${base}/pnl/?${createSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setPnl(response.data)))
      .catch((err) => handleErrors(err, dispatch, setPnlErrors));
  };
}

export class StocksApi {
  static getList = (token, kwargs = null) => dispatch => {
    dispatch(setStocksLoading(true));
    axios
      .get(`${base}/stocks/?${createSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setStocks(response.data)))
      .catch((err) => handleErrors(err, dispatch, setStocksErrors));
  };
}

export class TimetableApi {
  static deleteTimetable = (token, timetableId) => (dispatch) => {
    dispatch(setTimetableLoading(true));
    axios
      .delete(`${base}/timetables/${timetableId}/`, { headers: { Authorization: token } })
      .then(() => {dispatch(deleteTimetable(timetableId))})
      .catch((err) => handleErrors(err, dispatch, setTimetableErrors));
  };
  static get = (token, id) => dispatch => {
    dispatch(setTimetableLoading(id));
    axios
      .get(`${base}/timetables/${id}/`, { headers: { Authorization: token } })
      .then(response => dispatch(setTimetable(response.data)))
      .catch((err) => handleErrors(err, dispatch, setTimetableErrors));
  };
  static getTimetables = (token, page = null) => (dispatch) => {
    dispatch(setTimetablesLoading(true));
    axios
      .get(`${base}/timetables/?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(setTimetables(response.data))
      })
      .catch((err) => handleErrors(err, dispatch, setTimetableErrors));
  };
  static upload = (token, data) => dispatch => {
    dispatch(setTimetablesLoading(true))
    axios.post(
      `${base}/timetables/`,
      data,
      {headers: {Authorization: token, 'Content-Type': 'multipart/form-data'}}
    )
    .then((response) => {
      dispatch(createTimetable(response.data))
      toast.success("Timetable uploaded successfully!", toastParams)
    })
    .catch((err) => handleErrors(err, dispatch, setTimetableErrors));
  }
}

export class TransactionApi {
  static bulkUpdateTransactions = (token, data, kwargs) => dispatch => {
    dispatch(setTransactionsLoading(true))
    axios
      .put(`${base}/transactions/bulk-update/?${createSearchParams(kwargs)}`,
        data,
        { headers: { Authorization: token } })
      .then((response) => dispatch(setTransactions(response.data)))
      .catch((err) => handleErrors(err, dispatch, setTransactionsErrors))
  }
  static bulkUpdateTransactionsPreview = (token, data) => dispatch => {
    dispatch(setTransactionExtra({ loading: true }))
    axios
      .put(`${base}/transactions/bulk-update-preview/`,
        data,
        { headers: { Authorization: token } })
      .then((response) => {
        dispatch(setTransactionExtra({ loading: false, results: response.data }));
      })
      .catch((err) => {
        dispatch(setTransactionExtra({loading: false}))
        handleErrors(err, dispatch, setTransactionsErrors);
      })
  }
  static delete = (token, id) => dispatch => {
    dispatch(setLoadingTransactions(id));
    axios
      .delete(`${base}/transactions/${id}/`, { headers: { Authorization: token } })
      .then(() => dispatch(deleteTransaction(id)))
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
  static get = (token, transactionId) => dispatch => {
    dispatch(setLoadingTransactions(transactionId));
    axios
      .get(`${base}/transactions/${transactionId}/`, { headers: { Authorization: token } })
      .then((response) => dispatch(updateTransaction(response.data)))
      .catch((err) => handleErrors(err, dispatch, setTransactionsErrors));
  };
  static getList = (token, kwargs = null) => (dispatch) => {
    dispatch(setTransactionsLoading(true));
    kwargs = kwargs || {};
    axios
      .get(`${base}/transactions/?${createSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setTransactions(response.data)))
      .catch((err) => handleErrors(err, dispatch, setTransactionsErrors));
  };
  static uploadTransactions = (token, data, kwargs) => dispatch => {
    dispatch(setLoading(true))
    kwargs = kwargs || {};
    axios.post(
      `${base}/transactions/upload/?${createSearchParams(kwargs)}`,
      data,
      {headers: {Authorization: token, 'Content-Type': 'multipart/form-data'}}
    )
    .then((response) => {
      dispatch(setTransactions(response.data));
      toast.success("Payments uploaded successfully!", toastParams)

    })
    .catch((err) => handleErrors(err, dispatch, setTransactionsErrors));
  }
}

let base = "finance";

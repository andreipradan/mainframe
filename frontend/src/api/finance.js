import axios from "./index";
import {
  setAnalytics,
  setErrors as setAccountsErrors,
  setLoading as setAccountsLoading,
} from '../redux/accountsSlice';
import {
  set,
  setErrors,
  setLoading,
} from "../redux/creditSlice";
import {
  set as setCrypto,
  setErrors as setCryptoErrors,
  setLoading as setCryptoLoading,
} from '../redux/cryptoSlice'
import {
  set as setCryptoPnl,
  setLoading as setCryptoPnlLoading,
  setErrors as setCryptoPnlErrors,
} from "../redux/cryptoPnlSlice";
import {
  set as setStocks,
  setErrors as setStocksErrors,
  setLoading as setStocksLoading,
} from "../redux/stocksSlice";
import {
  set as setStocksPnl,
  setErrors as setStocksPnlErrors,
  setLoading as setStocksPnlLoading,
} from "../redux/pnlSlice";
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
  set as setPredictionResults,
  setErrors as setPredictionErrors,
  setLoading as setPredictionLoading,
  setLoadingTask,
  setTask,
} from "../redux/predictionSlice"
import {handleErrors} from "./errors";
import { toast } from 'react-toastify';
import { toastParams } from './auth';
import { Api } from './shared';

export class CryptoApi extends Api {
  baseUrl = "finance/crypto"
  set = setCrypto;
  setLoading = setCryptoLoading;
  setErrors = setCryptoErrors;
}

export class CryptoPnlApi extends Api {
  baseUrl = "finance/crypto/pnl"
  set = setCryptoPnl;
  setLoading = setCryptoPnlLoading;
  setErrors = setCryptoPnlErrors;
}

export class StocksApi extends Api {
  baseUrl = "finance/stocks"
  set = setStocks;
  setLoading = setStocksLoading;
  setErrors = setStocksErrors;
}

export class StocksPnlApi extends Api {
  baseUrl = "finance/stocks/pnl"
  set = setStocksPnl;
  setLoading = setStocksPnlLoading;
  setErrors = setStocksPnlErrors;
}

export class FinanceApi {
  static getExpenses = (token, accountId, year) => dispatch => {
    dispatch(setAccountsLoading(true));
    const url = `${base}/accounts/${accountId}/expenses/?year=${year}`
    axios
      .get(url, { headers: { Authorization: token } })
      .then(response => dispatch(setAnalytics(response.data)))
      .catch((err) => handleErrors(err, dispatch, setAccountsErrors));
  };
  static getCredit = token => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/credit/`, { headers: { Authorization: token } })
      .then(response => {dispatch(set(response.data))})
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

export class PredictionApi {
  static getTask = (token, type, updateLoading = true) => dispatch => {
    if (updateLoading)
      dispatch(setLoadingTask({type, loading: true}))
    axios
      .get(`${base}/prediction/${type}-status/`, { headers: { Authorization: token } })
      .then((response) => dispatch(setTask({type, data: response.data, updateLoading})))
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

const base = "finance";

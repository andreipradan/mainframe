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
  constructor(resource, token) {
    this.resource = resource
    this.setErrors = this._get_method("errors")
    this.token = token
  }

  _get_method = name => {
    return {
      errors: { crypto: setCryptoErrors, stocks: setStocksErrors },
      loading: { crypto: setCryptoLoading, stocks: setStocksLoading },
      set: { crypto: setCrypto, stocks: setStocks },
    }[name][this.resource]
  }

  set = (data) => this._get_method("set")(data)
  setLoading = (isLoading = true) => this._get_method("loading")(isLoading)

  getList = (kwargs = null) => (dispatch) => {
    dispatch(this.setLoading());
    axios
      .get(
        `${base}/${this.resource}/?${createSearchParams(kwargs)}`,
        {headers: { Authorization: this.token }})
      .then(response =>
        dispatch(this.set(response.data)))
      .catch(err => handleErrors(err, dispatch, this.setErrors));
  };

  upload = (token, data) => dispatch => {
    dispatch(this.setLoading());
    axios
      .post(
        `${base}/${this.resource}/`,
        data,
        {headers: {Authorization: token, 'Content-Type': 'multipart/form-data'}})
      .then(response=> {
        dispatch(this.set(response.data));
        toast.success(`${this.resource.charAt(0).toUpperCase() + this.resource.slice(1)} uploaded successfully!`, toastParams);
      })
      .catch(err => handleErrors(err, dispatch, this.setErrors));
  };

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

export class PnlApi {
  static getList = (token, kwargs = null) => dispatch => {
    dispatch(setPnlLoading(true));
    axios
      .get(`${base}/pnl/?${createSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setPnl(response.data)))
      .catch((err) => handleErrors(err, dispatch, setPnlErrors));
  };

  static upload = (token, data) => dispatch => {
    dispatch(setPnlLoading(true))
    axios.post(
      `${base}/pnl/`,
      data,
      {headers: {Authorization: token, 'Content-Type': 'multipart/form-data'}}
    )
    .then((response) => {
      dispatch(setPnl(response.data));
      toast.success("PnL uploaded successfully!", toastParams)

    })
    .catch((err) => handleErrors(err, dispatch, setPnlErrors));
  }
}

export class StocksApi {
  static getList = (token, kwargs = null) => dispatch => {
    dispatch(setStocksLoading(true));
    axios
      .get(`${base}/stocks/?${createSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setStocks(response.data)))
      .catch((err) => handleErrors(err, dispatch, setStocksErrors));
  };
  static upload = (token, data) => dispatch => {
    dispatch(setStocksLoading(true))
    axios.post(
      `${base}/stocks/`,
      data,
      {headers: {Authorization: token, 'Content-Type': 'multipart/form-data'}}
    )
    .then((response) => {
      dispatch(setStocks(response.data));
      toast.success("Stock transactions uploaded successfully!", toastParams)

    })
    .catch((err) => handleErrors(err, dispatch, setStocksErrors));
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

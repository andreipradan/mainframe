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
  create as createPension,
  set as setPension,
  setErrors as setPensionErrors,
  setLoading as setPensionLoading,
  setLoadingItems as setPensionLoadingItems,
  update as updatePension,
} from "../redux/pensionSlice";
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
  deleteItem as deleteTimetable,
  set as setTimetables,
  setErrors as setTimetableErrors,
  setLoading as setTimetablesLoading,
  setLoadingItems as setTimetablesLoadingItems,
  update as updateTimetable,
} from "../redux/timetableSlice";
import {
  set as setPredictionResults,
  setErrors as setPredictionErrors,
  setLoading as setPredictionLoading,
  setLoadingTask,
  setTask,
} from "../redux/predictionSlice"
import { handleErrors } from "./errors";
import { CreateApi, DeleteApi, DetailApi, ListApi, mix, TokenMixin, UpdateApi, UploadApi } from './shared';
import { toast } from 'react-toastify';
import { toastParams } from './auth';

export class CryptoApi extends mix(ListApi, TokenMixin) {
  static baseUrl = "finance/crypto"
  static methods = {
    set: setCrypto,
    setErrors: setCryptoErrors,
    setLoading: setCryptoLoading,
  }
}

export class CryptoPnlApi extends mix(ListApi, TokenMixin) {
  static baseUrl = "finance/crypto/pnl"
  static methods = {
    set: setCryptoPnl,
    setErrors: setCryptoPnlErrors,
    setLoading: setCryptoPnlLoading,
  }
}

export class PensionApi extends mix(CreateApi, ListApi, TokenMixin, UpdateApi) {
  static baseUrl = "finance/pension"
  static methods = {
    create: createPension,
    set: setPension,
    setErrors: setPensionErrors,
    setLoading: setPensionLoading,
    setLoadingItems: setPensionLoadingItems,
    update: updatePension,
  }
  createContribution = (pensionId, data) => dispatch => {
    dispatch(this.constructor.methods.setLoading(true))
    axios
      .post(`${this.constructor.baseUrl}/${pensionId}/contributions/`, data, { headers: { Authorization: this.token } })
      .then(response => {
        dispatch(this.constructor.methods.create(response.data))
        toast.success(`Contribution for '${data.date}' created successfully!`, toastParams);
      })
      .catch(err => handleErrors(err, dispatch, this.constructor.methods.setErrors))
  }
  updateContributionUnits = (pensionId, contributionId, units) => dispatch => {
    dispatch(this.constructor.methods.setLoading())
    axios
      .patch(
        `${this.constructor.baseUrl}/${pensionId}/update-units/`,
        {units, contribution_id: contributionId},
        {headers: { Authorization: this.token } }
      )
    .then(response => {
      dispatch(this.constructor.methods.update(response.data))
      toast.success(`Contribution updated successfully!`, toastParams);
    })
    .catch(err => handleErrors(err, dispatch, this.constructor.methods.setErrors))
  }
  syncContributionUnits = (pensionId, contributionId) => dispatch => {
    dispatch(this.constructor.methods.setLoading())
    axios
      .patch(
        `${this.constructor.baseUrl}/${pensionId}/sync-units/`,
        {contribution_id: contributionId},
        {headers: { Authorization: this.token } }
      )
    .then(response => {
      dispatch(this.constructor.methods.update(response.data))
      toast.success(`Contribution units calculated successfully!`, toastParams);
    })
    .catch(err => handleErrors(err, dispatch, this.constructor.methods.setErrors))
  }
}

export class StocksApi extends mix(ListApi, TokenMixin) {
  static baseUrl = "finance/stocks"
  static methods = {
    set: setStocks,
    setErrors: setStocksErrors,
    setLoading: setStocksLoading,
  }
}

export class StocksPnlApi extends mix(ListApi, TokenMixin) {
  static baseUrl = "finance/stocks/pnl"
  static methods = {
    set: setStocksPnl,
    setErrors: setStocksPnlErrors,
    setLoading: setStocksPnlLoading,
  }
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

export class TimetableApi extends mix(DeleteApi, DetailApi, ListApi, TokenMixin, UpdateApi, UploadApi) {
  static baseUrl = "finance/timetables"
  static methods = {
    delete: deleteTimetable,
    set: setTimetables,
    setErrors: setTimetableErrors,
    setLoading: setTimetablesLoading,
    setLoadingItems: setTimetablesLoadingItems,
    update: updateTimetable,
  }
}

const base = "finance";

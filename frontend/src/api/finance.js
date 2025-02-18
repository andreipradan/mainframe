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
  create as createBonds,
  set as setBonds,
  setErrors as setBondsErrors,
  setLoading as setBondsLoading,
  setLoadingItems as setBondsLoadingItems,
  update as updateBonds,
} from '../redux/bondsSlice'
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
  create as createDeposits,
  set as setDeposits,
  setErrors as setDepositsErrors,
  setLoading as setDepositsLoading,
  setLoadingItems as setDepositsLoadingItems,
  update as updateDeposits,
} from '../redux/depositsSlice'
import {
  set as setInvestments,
  setErrors as setInvestmentsErrors,
  setLoading as setInvestmentsLoading,
} from '../redux/investmentsSlice'
import {
  create as createPension,
  deleteContribution,
  set as setPension,
  setCompletedLoadingItem as setPensionCompletedLoadingItem,
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
  setCompletedLoadingItem as setTimetableCompletedLoadingItem,
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

export class BondsApi extends mix(CreateApi, DetailApi, ListApi, TokenMixin, UpdateApi) {
  static baseUrl = "finance/bonds"
  static methods = {
    create: createBonds,
    set: setBonds,
    setErrors: setBondsErrors,
    setLoading: setBondsLoading,
    setLoadingItems: setBondsLoadingItems,
    update: updateBonds,
  }
}

export class CryptoApi extends mix(ListApi, TokenMixin, UploadApi) {
  static baseUrl = "finance/crypto"
  static methods = {
    set: setCrypto,
    setErrors: setCryptoErrors,
    setLoading: setCryptoLoading,
  }
}

export class CryptoPnlApi extends mix(ListApi, TokenMixin, UploadApi) {
  static baseUrl = "finance/crypto/pnl"
  static methods = {
    set: setCryptoPnl,
    setErrors: setCryptoPnlErrors,
    setLoading: setCryptoPnlLoading,
  }
}

export class DepositsApi extends mix(CreateApi, DetailApi, ListApi, TokenMixin, UpdateApi) {
  static baseUrl = "finance/deposits"
  static methods = {
    create: createDeposits,
    set: setDeposits,
    setErrors: setDepositsErrors,
    setLoading: setDepositsLoading,
    setLoadingItems: setDepositsLoadingItems,
    update: updateDeposits,
  }
}

export class InvestmentsApi extends mix(ListApi, TokenMixin) {
  static baseUrl = "finance/investments"
  static methods = {
    set: setInvestments,
    setErrors: setInvestmentsErrors,
    setLoading: setInvestmentsLoading,
  }
}

export class PensionApi extends mix(CreateApi, DetailApi, ListApi, TokenMixin, UpdateApi) {
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
        dispatch(this.constructor.methods.update(response.data))
        toast.success(`Contribution for '${data.date}' created successfully!`, toastParams);
      })
      .catch(err => handleErrors(err, dispatch, this.constructor.methods.setErrors, this.constructor.methods.setLoading))
  }
  deleteContribution = (pensionId, contributionId, month=null) => dispatch => {
    dispatch(this.constructor.methods.setLoadingItems(pensionId))
    axios
      .delete(
        `${this.constructor.baseUrl}/${pensionId}/contribution/?contribution_id=${contributionId}`,
        {headers: {Authorization: this.token}}
      )
      .then(response => {
        dispatch(deleteContribution({pensionId, contributionId}))
        const verbose = month || contributionId
        toast.warning(`Contribution ${verbose} deleted!`, toastParams)
      })
      .catch(err => {
        dispatch(setPensionCompletedLoadingItem(pensionId))
        handleErrors(err, dispatch, this.constructor.methods.setErrors);
      })
  }
  updateContribution = (pensionId, contributionId, data) => dispatch => {
    dispatch(this.constructor.methods.setLoadingItems(pensionId))
    axios
      .patch(
        `${this.constructor.baseUrl}/${pensionId}/contribution/?contribution_id=${contributionId}`,
        {...data, contribution_id: contributionId},
        {headers: { Authorization: this.token } }
      )
    .then(response => {
      dispatch(this.constructor.methods.update(response.data))
      toast.success(`Contribution for ${data.date} updated!`, toastParams);
    })
    .catch(err => {
      dispatch(setPensionCompletedLoadingItem(pensionId))
      handleErrors(err, dispatch, this.constructor.methods.setErrors);
    })
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
      .catch((err) => handleErrors(err, dispatch, setAccountsErrors, setAccountsLoading));
  };
  static getCredit = token => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/credit/`, { headers: { Authorization: token } })
      .then(response => {dispatch(set(response.data))})
      .catch((err) => handleErrors(err, dispatch, setErrors, setLoading));
  };
}

export class PredictionApi {
  static getTask = (token, type, updateLoading = true) => dispatch => {
    if (updateLoading)
      dispatch(setLoadingTask({type, loading: true}))
    axios
      .get(`${base}/prediction/${type}-status/`, { headers: { Authorization: token } })
      .then((response) => dispatch(setTask({type, data: response.data, updateLoading})))
      .catch((err) => handleErrors(err, dispatch, setPredictionErrors, setLoadingTask));
  };
  static getTasks = token => dispatch => {
    dispatch(setPredictionLoading(true))
    axios
      .get(`${base}/prediction/`, { headers: { Authorization: token } })
      .then((response) => dispatch(setPredictionResults(response.data)))
      .catch((err) => handleErrors(err, dispatch, setPredictionErrors, setPredictionLoading));
  };
  static predict = (token, data) => dispatch => {
    dispatch(setLoadingTask({type: "predict", loading: true}))
    axios
      .put(`${base}/prediction/start-prediction/`, data, {headers: {Authorization: token}})
      .then(response => dispatch(setTask({type: "predict", data: response.data})))
      .catch(err => handleErrors(err, dispatch, setPredictionErrors, setLoadingTask))
  }
  static train = token => dispatch => {
    dispatch(setLoadingTask({type: "train", loading: true}))
    axios
      .put(`${base}/prediction/start-training/`, {}, {headers: {Authorization: token}})
      .then(response => dispatch(setTask({type: "train", data: response.data})))
      .catch(err => handleErrors(err, dispatch, setPredictionErrors, setLoadingTask))
  }
}

export class TimetableApi extends mix(DeleteApi, DetailApi, ListApi, TokenMixin, UpdateApi, UploadApi) {
  static baseUrl = "finance/timetables"
  static methods = {
    delete: deleteTimetable,
    set: setTimetables,
    setCompletedLoadingItem: setTimetableCompletedLoadingItem,
    setErrors: setTimetableErrors,
    setLoading: setTimetablesLoading,
    setLoadingItems: setTimetablesLoadingItems,
    update: updateTimetable,
  }
}

const base = "finance";

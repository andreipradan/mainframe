import { ngrokAxios } from "./index";
import {
  create,
  deleteCron,
  set,
  setErrors,
  setLoading,
  setLoadingCron,
  update,
} from "../redux/cronsSlice";
import { handleErrors } from "./errors";
import { toast } from "react-toastify";
import { toastParams } from "./auth";
import { CreateApi, DeleteApi, DetailApi, ListApi, mix, TokenMixin, UpdateApi } from './shared';


class CronsApi extends mix(CreateApi, DeleteApi, DetailApi, ListApi, TokenMixin, UpdateApi) {
  static baseUrl = "crons"
  static methods = {create, delete: deleteCron, set, setErrors, setLoading, setLoadingItems: setLoadingCron, update}
  static displayField = "name"

  static kill = (token, cronId, cronCommand) => dispatch => {
    dispatch(setLoading(true));
    ngrokAxios
      .put(`crons/${cronId}/kill/`, {}, { headers: { Authorization: token } })
      .then(() => dispatch(setErrors([`Process ${cronCommand} killed`])))
      .catch((err) => {
        if (err.response?.status === 404)
          return dispatch(setErrors([`Process ${cronCommand} does not exist`]))
        return handleErrors(err, dispatch, setErrors)
      });
  };
  static run = (token, cronId, cronCommand) => dispatch => {
    dispatch(setLoading(true));
    ngrokAxios
      .put(`crons/${cronId}/run/`, {}, { headers: { Authorization: token } })
      .then(() => {
        toast.success(`"${cronCommand}" executed successfully!`, toastParams)
        dispatch(setLoading(false))
      })
      .catch((err) => {
        if (err.response?.status === 404)
          return dispatch(setErrors([`Process ${cronCommand} does not exist`]))
        return handleErrors(err, dispatch, setErrors)
      });
  }
}

export default CronsApi;

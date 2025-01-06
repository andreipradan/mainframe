import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
} from "../redux/commandsSlice";
import { handleErrors } from "./errors";
import { toast } from "react-toastify";
import { toastParams } from "./auth";
import { Api } from './shared';


class CommandsApi extends Api {
  baseUrl = "commands"
  set = set
  setErrors = setErrors
  setLoading = setLoading

  static deleteCron = (token, command, cronId = null) => dispatch => {
    dispatch(setLoading(true));
    const data = {}
    if (cronId) data.cron_id = cronId
    axios
      .put(`${base}/${command}/delete-cron/`, data, { headers: { Authorization: token } })
      .then(response => {
        toast.warning(`"${command}" cron deleted`, toastParams)
        dispatch(set(response.data))
      })
      .catch((err) => handleErrors(err, dispatch, setErrors))
  };
  static run = (token, command, commandArguments = null) => dispatch => {
    dispatch(setLoading(true));
    axios
      .put(`${base}/${command}/run/`, {args: commandArguments}, { headers: { Authorization: token } })
      .then(() => {
        toast.success(`"${command}" executed successfully!`, toastParams)
        dispatch(setLoading(false))
        dispatch(setErrors(null))
      })
      .catch((err) => handleErrors(err, dispatch, setErrors))
  };
  static setCron = (token, command, cron, cronId = null) => dispatch => {
    dispatch(setLoading(true));
    const data = {expression: cron}
    if (cronId) data.cron_id = cronId
    axios
      .put(`${base}/${command}/set-cron/`, data, { headers: { Authorization: token } })
      .then(response => {
        toast.success(`"${command}" cron set to ${cron}`, toastParams)
        dispatch(set(response.data))

      })
      .catch((err) => handleErrors(err, dispatch, setErrors))
  };
}

const base = "commands";

export default CommandsApi;

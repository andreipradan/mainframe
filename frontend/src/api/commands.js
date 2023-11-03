import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
} from "../redux/commandsSlice";
import { handleErrors } from "./errors";
import { toast } from "react-toastify";
import { toastParams } from "./auth";


class CommandsApi {
  static getList = token => dispatch => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
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
}

let base = "commands";

export default CommandsApi;

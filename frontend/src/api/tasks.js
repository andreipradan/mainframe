import axios from "./index";
import {
  selectItem,
  set,
  setErrors,
  setLoading,
} from "../redux/tasksSlice"

import { handleErrors } from "./errors";
import {toast} from "react-toastify";
import {toastParams} from "./auth";

class TasksApi {
  static deleteHistory = (token, taskName) => dispatch => {
    dispatch(setLoading(true));
    axios
      .delete(`${base}/${taskName}/delete-history/`,{ headers: { Authorization: token } })
      .then(response => {
          toast.success(`"${taskName}" deleted successfully!`, toastParams)
          dispatch(set(response.data))
          dispatch(selectItem(null))
        }
      )
      .catch(err =>
        err.status === 400
          ? toast.warning(`${taskName} details not found!`)
          : handleErrors(err, dispatch, setErrors)
      );
  };
  static getList = token => dispatch => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/`, { headers: { Authorization: token } })
      .then(response => dispatch(set(response.data)))
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
  static flushLocks = token => dispatch => {
    dispatch(setLoading(true));
    axios
      .put(`${base}/flush-locks/`, {},{ headers: { Authorization: token } })
      .then(() => {
          toast.success(`Logs flushed successfully!`, toastParams)
          dispatch(setLoading(false))
          dispatch(setErrors(null))
        }
      )
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
}

let base = "tasks";

export default TasksApi;

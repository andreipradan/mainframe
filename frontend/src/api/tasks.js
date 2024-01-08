import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
} from "../redux/tasksSlice"

import { handleErrors } from "./errors";

class TasksApi {
  static getList = token => dispatch => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/`, { headers: { Authorization: token } })
      .then(response => dispatch(set(response.data)))
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
}

let base = "tasks";

export default TasksApi;

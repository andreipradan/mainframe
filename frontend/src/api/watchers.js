import axios from "./index";
import {
  set, setItem, setCompletedLoadingItem, setErrors, setLoading, setLoadingItems, update
} from "../redux/watchersSlice";
import { handleErrors } from "./errors";
import { toast } from "react-toastify";
import { toastParams } from "./auth";


class WatchersApi {
  static getItem = (token, id) => dispatch => {
    dispatch(setLoadingItems(id));
    axios
      .get(`${base}${id}/`, { headers: { Authorization: token } })
      .then((response) => dispatch(setItem(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getList = (token) => dispatch => {
    dispatch(setLoading(true));
    axios
      .get(base, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static run = (token, id) => dispatch => {
    dispatch(setLoadingItems(id));
    axios
      .put(`${base}${id}/run/`, {}, { headers: { Authorization: token } })
      .then(response => {
        if (response.data.result) {
          toast.success("Found new article!", toastParams)
          dispatch(this.getItem(token, id))
        }
        else toast.warning("No new articles found", toastParams)
        dispatch(setCompletedLoadingItem(id));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  }
  static update = (token, id, data) => dispatch => {
    dispatch(setLoadingItems(id));
    axios
      .patch(`${base}${id}/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(update(response.data));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

let base = "watchers/";

export default WatchersApi;

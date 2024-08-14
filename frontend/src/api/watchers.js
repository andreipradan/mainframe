import axios from "./index";
import {
  create, deleteItem, set, setItem, setCompletedLoadingItem, setErrors, setLoading, setLoadingItems, update
} from "../redux/watchersSlice";
import { handleErrors } from "./errors";
import { toast } from "react-toastify";
import { toastParams } from "./auth";


class WatchersApi {
  static create = (token, data) => dispatch => {
    dispatch(setLoading());
    axios
      .post(base, data, { headers: { Authorization: token } })
      .then((response) => dispatch(create(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static delete = (token, id) => dispatch => {
    dispatch(setLoadingItems(id));
    axios
      .delete(`${base}${id}/`, { headers: { Authorization: token } })
      .then(() => dispatch(deleteItem(id)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
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
        if (response.data) {
          toast.success("Found new item!", toastParams)
          dispatch(setItem(response.data))
        }
        else toast.warning("No new items found", toastParams)
        dispatch(setCompletedLoadingItem(id));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  }
  static test = (token, url, selector) => dispatch => {
    dispatch(setLoading());
    axios
      .put(`${base}test/`, {url, selector}, { headers: { Authorization: token } })
      .then(response => toast.success(response.data.result, toastParams))
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

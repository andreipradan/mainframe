import axios from "./index";
import {
  create, deleteItem, set, setItem, setCompletedLoadingItem, setErrors, setLoading, setLoadingItems, update
} from "../redux/watchersSlice";
import { handleErrors } from "./errors";
import { toast } from "react-toastify";
import { toastParams } from "./auth";
import { CreateApi, DeleteApi, DetailApi, ListApi, mix, TokenMixin, UpdateApi } from './shared';


class WatchersApi extends mix(CreateApi, DeleteApi, DetailApi, ListApi, TokenMixin, UpdateApi) {
  static baseUrl = "watchers";
  static methods = {create, delete: deleteItem, set, setErrors, setLoading, setLoadingItems, update}
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
    dispatch(setLoading(true));
    axios
      .put(`${base}test/`, {url, selector}, { headers: { Authorization: token } })
      .then(response => {
        toast.success(response.data.result, toastParams);
        dispatch(setLoading(false))
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  }
}

const base = "watchers/";

export default WatchersApi;

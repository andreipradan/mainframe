import { axios, ngrokAxios } from "./index";
import {
  create,
  deleteItem,
  set,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from "../redux/devicesSlice";
import {handleErrors} from "./errors";


class DevicesApi {
  static create = (token, data) => dispatch => {
    dispatch(setLoading(true))
    axios
      .post(`${base}/`, data, { headers: { Authorization: token}})
      .then(response => dispatch(create(response.data)))
      .catch(err => handleErrors(err, dispatch, setErrors))
  };
  static delete = (token, deviceId) => dispatch => {
    dispatch(setLoadingItems(deviceId));
    axios
      .delete(`${base}/${deviceId}/`, { headers: { Authorization: token } })
      .then(() => dispatch(deleteItem(deviceId)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getList = (token, search = null) => (dispatch) => {
    dispatch(setLoading(true));
    let url = `${base}/`
    if (search)
      url += `?search=${search}`
    axios
      .get(url, { headers: { Authorization: token } })
      .then((response) => {
        response.data.results = response.data.results.map(d => ({ ...d, displayName: d.alias || d.name })).sort((a, b) =>
          a.is_active === b.is_active
            ? a.displayName > b.displayName ? 1 : -1
            : a.is_active > b.is_active ? -1 : 1,
        )
        dispatch(set(response.data));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static sync = token => dispatch => {
    dispatch(setLoading(true));
    ngrokAxios
      .put(`${base}/sync/`, {}, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static updateDevice = (token, deviceId, data) => dispatch => {
    dispatch(setLoadingItems(deviceId));
    axios
      .patch(`${base}/${deviceId}/`, data, { headers: { Authorization: token } })
      .then(response => dispatch(update(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

const base = "devices";

export default DevicesApi;

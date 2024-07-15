import { axios, ngrokAxios } from "./index";
import {
  deleteDevice,
  set,
  setErrors,
  setLoading,
  setLoadingDevice,
  update,
} from "../redux/devicesSlice";
import {handleErrors} from "./errors";


class DevicesApi {
  static delete = (token, deviceId) => dispatch => {
    dispatch(setLoadingDevice(deviceId));
    axios
      .delete(`${base}${deviceId}/`, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(deleteDevice(deviceId));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getList = (token, search = null) => (dispatch) => {
    dispatch(setLoading(true));
    let url = `${base}/`
    if (searchTerm)
      url += `?search=${search}`
    axios
      .get(url, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
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
    dispatch(setLoadingDevice(deviceId));
    axios
      .patch(`${base}/${deviceId}/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(update(response.data));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

let base = "devices";

export default DevicesApi;

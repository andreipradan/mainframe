import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
  setLoadingDevice,
  update,
} from "../redux/devicesSlice";
import {handleErrors} from "./errors";


class DevicesApi {
  static getList = (token, page = null) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(base + `?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static sync = token => dispatch => {
    dispatch(setLoading(true));
    axios
      .put(`${base}sync/`, {}, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static updateDevice = (token, deviceId, data) => dispatch => {
    dispatch(setLoadingDevice(deviceId));
    axios
      .patch(`${base}${deviceId}/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(update(response.data));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

let base = "devices/";

export default DevicesApi;

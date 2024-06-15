import {lightsAxios as axios} from "./index";
import {
  set,
  setBrightness,
  setColorTemp,
  setErrors,
  setLoading,
  setLoadingItems,
  setName,
  turn_all_off,
  turn_all_on,
  turn_off,
  turn_on,
  unsetLoadingLight,
} from "../redux/lightsSlice";
import {handleErrors} from "./errors";


class LightsApi {
  static getList = (token) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(`${base}/`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static setBrightness = (token, lightIp, brightness) => (dispatch) => {
    dispatch(setLoadingItems(lightIp));
    axios
      .patch(
        `${base}/${lightIp}/set-brightness/`,
        {brightness: brightness},
        {headers: {Authorization: token}})
      .then(() => dispatch(setBrightness({ip: lightIp, brightness: brightness})))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static setColorTemp = (token, lightIp, colorTemp) => (dispatch) => {
    dispatch(setLoadingItems(lightIp));
    axios
      .patch(`${base}/${lightIp}/set-color-temp/`,
        {color_temp: colorTemp},
        {headers: {Authorization: token}})
      .then(() => dispatch(setColorTemp({ip: lightIp, colorTemp: colorTemp})))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static setName = (token, lightIp, name) => dispatch => {
    dispatch(setLoadingItems(lightIp));
    axios
      .patch(`${base}/${lightIp}/set-name/`,
        {name: name},
        {headers: {Authorization: token}})
      .then(() => dispatch(setName({ip: lightIp, name: name})))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static setRgb = (token, lightIp, rgb) => (dispatch) => {
    dispatch(setLoadingItems(lightIp));
    axios
      .patch(`${base}/${lightIp}/set-rgb/`,
        {rgb: rgb},
        {headers: {Authorization: token}})
      .then(() => dispatch(unsetLoadingLight(lightIp)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static turn_all_off = token => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .put(`${base}/turn-all-off/`, {}, {headers: {Authorization: token}})
      .then(() => dispatch(turn_all_off()))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static turn_all_on = token => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .put(`${base}/turn-all-on/`, {}, {headers: {Authorization: token}})
      .then(() => dispatch(turn_all_on()))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static turn_off = (token, lightId) => (dispatch) => {
    dispatch(setLoadingItems(lightId));
    axios
      .put(`${base}/${lightId}/turn-off/`, {}, {headers: {Authorization: token}})
      .then(() => dispatch(turn_off(lightId)))
      .catch(err => handleErrors(err, dispatch, setErrors));
  };
  static turn_on = (token, lightId) => (dispatch) => {
    dispatch(setLoadingItems(lightId));
    axios
      .put(`${base}/${lightId}/turn-on/`, {}, {headers: {Authorization: token}})
      .then(() => dispatch(turn_on(lightId)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

let base = "lights";

export default LightsApi;

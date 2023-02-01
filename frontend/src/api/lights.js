import axios from "./index";
import {
  set,
  setLoading,
  setLoadingLight,
  turn_off,
  turn_on,
} from "../redux/lightsSlice";
import {handleErrors} from "./bots";


class LightsApi {
  static getList = (token) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(base, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch));
  };
  static turn_off = (token, lightId) => (dispatch) => {
    dispatch(setLoadingLight(lightId));
    axios
      .put(`${base}${lightId}/turn-off`,
        {},
        {headers: {Authorization: token}},
      )
      .then((response) => {
        dispatch(turn_off(lightId));
      })
      .catch((err) => handleErrors(err, dispatch));
  };
  static turn_on = (token, lightId) => (dispatch) => {
    dispatch(setLoadingLight(lightId));
    axios
      .put(`${base}${lightId}/turn-on`,
        {},
        {headers: {Authorization: token}},
      )
      .then((response) => {
        dispatch(turn_on(lightId));
      })
      .catch((err) => handleErrors(err, dispatch));
  };
}

let base = "lights/";

export default LightsApi;

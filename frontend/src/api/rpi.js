import { ngrokAxios } from "./index";
import {
  completed,
  setErrors,
  setLoading,
} from "../redux/rpiSlice";
import {handleErrors} from "./errors";
import {logout} from "../redux/authSlice";


class RpiApi {
  static clearBuild = token => dispatch => {
    dispatch(setLoading(true))
    ngrokAxios
      .put(`${base}/clear-build/`, {}, {headers: {Authorization: token}})
      .then(() => dispatch(completed("Build cleared, after copying the static files, please restart backend")))
      .catch(err => handleErrors(err, dispatch, setErrors))
  }
  static reboot = token => dispatch => {
    dispatch(setLoading(true));
    ngrokAxios
      .put(`${base}/reboot/`, {}, { headers: { Authorization: token } })
      .then(() => {
        dispatch(completed("Rebooting"))
        dispatch(logout("Started reboot, please refresh this page after a couple of moments"))
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static restartService = (token, service) => dispatch => {
    dispatch(setLoading(true));
    ngrokAxios
      .put(`${base}/restart-service/`, {service}, { headers: { Authorization: token } })
      .then(() => {
        dispatch(completed(`Restarted ${service}, please refresh this page after a few of moments`))
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

let base = "rpi";

export default RpiApi;

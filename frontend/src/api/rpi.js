import axios from "./index";
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
    axios
      .put(`${base}/clear-build/`, {}, {headers: {Authorization: token}})
      .then(() => {
        dispatch(logout("Build cleared!"))
        dispatch(completed())
      })
      .catch(err => handleErrors(err, dispatch, setErrors))
  }
  static reboot = token => dispatch => {
    dispatch(setLoading(true));
    axios
      .put(`${base}/reboot/`, {}, { headers: { Authorization: token } })
      .then(() => {
        dispatch(logout("Started reboot, please refresh this page after a couple of moments"))
        dispatch(completed())
      })
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

let base = "rpi";

export default RpiApi;

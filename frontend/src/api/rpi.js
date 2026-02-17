import { ngrokAxios } from './index';
import {
  completed,
  login,
  logout,
  setErrors,
  setLoading,
} from '../redux/rpiSlice';
import { handleErrors } from './errors';
import { toast } from 'react-toastify';
import { toastParams } from './auth';

class RpiApi {
  static login = (data) => (dispatch) => {
    dispatch(setLoading(true));
    ngrokAxios
      .post('users/login', data)
      .then((response) => {
        dispatch(login(response.data));
        toast.info('Connected to RPi!', toastParams);
      })
      .catch((err) => handleErrors(err, dispatch, setErrors, setLoading));
  };

  static logout = (token) => (dispatch) => {
    ngrokAxios
      .put('users/logout', {}, { headers: { Authorization: token } })
      .then(() => {
        toast.info('Logged out RPi!', toastParams);
      })
      .catch((err) => handleErrors(err, dispatch, setErrors))
      .finally(() => dispatch(logout()));
  };

  static reboot = (token) => (dispatch) => {
    dispatch(setLoading(true));
    ngrokAxios
      .put(`${base}/reboot/`, {}, { headers: { Authorization: token } })
      .then(() => {
        dispatch(completed('Rebooting'));
        dispatch(
          logout(
            'Started reboot, please refresh this page after a couple of moments'
          )
        );
      })
      .catch((err) => handleErrors(err, dispatch, setErrors, setLoading));
  };
  static resetTasks = (token) => (dispatch) => {
    dispatch(setLoading(true));
    ngrokAxios
      .put(`${base}/reset-tasks/`, {}, { headers: { Authorization: token } })
      .then(() => {
        dispatch(completed('Resetting Tasks...'));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors, setLoading));
  };
  static restartService = (token, service) => (dispatch) => {
    dispatch(setLoading(true));
    ngrokAxios
      .put(
        `${base}/restart-service/`,
        { service },
        { headers: { Authorization: token } }
      )
      .then(() => {
        dispatch(
          completed(
            `Restarted ${service}, please refresh this page after a few of moments`
          )
        );
      })
      .catch((err) => handleErrors(err, dispatch, setErrors, setLoading));
  };
}

const base = 'rpi';

export default RpiApi;

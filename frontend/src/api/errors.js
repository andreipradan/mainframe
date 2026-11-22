import { logout } from '../redux/authSlice';
import { toast } from 'react-toastify';
import { toastParams } from './auth';

export const handleErrors = (err, dispatch, setErrors, setLoading) => {
  if (err.response) {
    const contentType = err.response.headers['content-type'];
    if (!contentType.startsWith('application/json')) {
      const error = `Unexpected response [${err.response.statusText || err.response.status}]`;
      return dispatch(setErrors([error]));
    }
    if (err.response.data) {
      const isNgrok = err.request.responseURL.startsWith(
        import.meta.env.VITE_NGROK_URL
      );
      if (!isNgrok && err.response.data?.msg === 'User is not logged on.') {
        toast.warning('Session expired - please log in!', toastParams);
        if (setLoading) dispatch(setLoading(false));
        dispatch(logout());
        return undefined;
      }
      return dispatch(setErrors(err.response.data));
    }
  } else {
    const message = err.response?.status || err.response || err.message;
    return dispatch(setErrors([`Something went wrong [${message}]`]));
  }
};

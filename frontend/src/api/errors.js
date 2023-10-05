import Cookie from "js-cookie";
import {logout} from "../redux/authSlice";

export const handleErrors = (err, dispatch, setErrors) => {
  if (err.response) {
    const contentType = err.response.headers["content-type"];
    if (!contentType.startsWith("application/json")) {
      const error = `Unexpected response [${err.response.statusText || err.response.status}]`
      return dispatch(setErrors([error]));
    }
    if (err.response.data) {
      if (err.response.data?.msg === "User is not logged on.") {
        Cookie.remove('expires_at');
        Cookie.remove('token');
        Cookie.remove('user');
        dispatch(logout())
      }
      return dispatch(setErrors(err.response.data))
    }
  } else {
    const message = err.response?.status || err.response || err.message
    return dispatch(setErrors([`Something went wrong [${message}]`]))
  }
};

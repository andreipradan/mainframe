import Cookie from "js-cookie";
import {logout} from "../redux/authSlice";

export const handleErrors = async (err, dispatch, setErrors) => {
  if (err.response) {
    const contentType = err.response.headers["content-type"];
    if (!contentType.startsWith("application/json"))
      return dispatch(setErrors([`Unexpected response [${err.response.statusText}]`]));
  }
  if (err.response?.data) {
    if (err.response.data["msg"] === "User is not logged on.") {
      Cookie.remove('expires_at');
      Cookie.remove('token');
      Cookie.remove('user');
      dispatch(logout())
      return dispatch(setErrors([err.response.data["msg"]]))
    }
    dispatch(
      setErrors(
        Object.keys(err.response.data).map((k) => {
          let errors = err.response.data[k];
          return `${k}: ${
            Array.isArray(errors)
              ? errors.join(", ")
              : errors.constructor === Object
                ? Object.keys(errors).map(k => {
                  const errs = errors[k]
                  return `${k}: ${Array.isArray(errs) ? errs.join(", ") : errs}`
                })
                : errors
          }`
        })
      )
    );
  } else {
    dispatch(
      setErrors([`Something went wrong [${err.response?.status || err.response || err.message}]`])
    );
  }
};
import axios from "./index";
import Cookie from 'js-cookie'
import { login, logout, setErrors, setLoading } from "../redux/authSlice";

const handleErrors = async (err, dispatch) => {
  if (err.response) {
    const contentType = err.response.headers["content-type"];
    if (!contentType.startsWith("application/json"))
      return dispatch(setErrors([`Unexpected response [${err.response.statusText}]`]));
  }
  if (err.response?.data) {
    if (err.response.data["msg"] === "User is not logged on.") {
      localStorage.clear();
    }
    dispatch(setErrors(err.response.data));
  } else {
    dispatch(
      setErrors([`Something went wrong [${err.response?.status || err.response || err.message}]`])
    );
  }
};

class AuthApi {
  static Login = (data, history) => dispatch => {
    dispatch(setLoading(true))
    axios.post(`${base}/login`, data)
    .then(response => {
      Cookie.set('token', response.data.token);
      Cookie.set('user', JSON.stringify(response.data.user));
      dispatch(login(response.data))
      history.push("/")
    })
    .catch((err) => handleErrors(err, dispatch));
  };

  static Register = (data) => {
    return axios.post(`${base}/register`, data);
  };

  static Logout = (data, history) => dispatch => {
    axios.post(`${base}/logout`, data, { headers: { Authorization: `${data.token}` } })
    .then(() => {
      Cookie.remove('token');
      Cookie.remove('user');
      dispatch(logout())
      history.push("/login")
    });
  };
}

let base = "users";

export default AuthApi;

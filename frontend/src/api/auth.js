import axios from "./index";
import Cookie from 'js-cookie'
import { login, logout, setErrors, setLoading } from "../redux/authSlice";
import { handleErrors } from "./errors";
import {toast} from "react-toastify";

export const toastParams = {pauseOnFocusLoss: true, theme: "colored"}

class AuthApi {
  static Login = (data, history) => dispatch => {
    dispatch(setLoading(true))
    axios.post(`${base}/login`, data)
    .then(response => {
      Cookie.set('token', response.data.token);
      Cookie.set('user', JSON.stringify(response.data.user));
      dispatch(login(response.data))
      toast.info(`Welcome ${response.data.user.name} !`, toastParams)
      history.push(response.data.user?.is_staff ? "/" : "/expenses")
    })
    .catch((err) => handleErrors(err, dispatch, setErrors));
  };

  static Register = (data, history) => dispatch => {
    dispatch(setLoading(true))
    axios.post(`${base}/register`, data)
    .then(response => {
      dispatch(setLoading(false))
      toast.success(response.data["msg"], toastParams)
      history.push("/login")
    })
    .catch((err) => handleErrors(err, dispatch, setErrors));
  };

  static Logout = (token, history) => dispatch => {
    axios.put(`${base}/logout`, {}, { headers: { Authorization: token } })
    .then(() => {
      Cookie.remove('token');
      Cookie.remove('user');
      dispatch(logout())
      toast.info("Logged out successfully", toastParams)
      history.push("/login")
    }).catch(err => handleErrors(err, dispatch, setErrors))
  };
}

let base = "users";

export default AuthApi;

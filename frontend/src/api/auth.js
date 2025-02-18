import axios from "./index";
import { login, logout, setErrors, setLoading } from "../redux/authSlice";
import { handleErrors } from "./errors";
import { toast } from "react-toastify";

export const toastParams = {pauseOnFocusLoss: true, theme: "colored"}

class AuthApi {
  static Login = (data, history, redirectUrl) => dispatch => {
    dispatch(setLoading(true))
    axios.post(`${base}/login`, data)
    .then(response => {
      dispatch(login(response.data))
      toast.info(`Welcome ${response.data.user.username} !`, toastParams)
      history.push(
        response.data.user?.is_staff
          ? redirectUrl || "/"
          : redirectUrl || "/expenses"
      )
    })
    .catch((err) => handleErrors(err, dispatch, setErrors, setLoading));
  };

  static Register = (data, history) => dispatch => {
    dispatch(setLoading(true))
    axios.post(`${base}/register`, data)
    .then(response => {
      dispatch(setLoading(false))
      toast.success(response.data.msg, toastParams)
      history.push("/login")
    })
    .catch((err) => handleErrors(err, dispatch, setErrors, setLoading));
  };

  static Logout = (token, history) => dispatch => {
    axios.put(`${base}/logout`, {}, { headers: { Authorization: token } })
    .then(() => {
      dispatch(logout())
      toast.info("Logged out successfully", toastParams)
      history.push("/login")
    }).catch(err => handleErrors(err, dispatch, setErrors))
  };
}

const base = "users";

export default AuthApi;

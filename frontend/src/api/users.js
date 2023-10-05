import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
  setLoadingUsers,
  updateUser,
} from "../redux/usersSlice";
import { handleErrors } from "./errors";


class UsersApi {
  static getList = (token, page = null) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .get(base + `/?page=${page || 1}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static getUser = (token, id) => dispatch => {
    dispatch(setLoadingUsers(id));
    axios
      .get(`${base}/${id}/`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static updateUser = (token, id, data) => dispatch => {
    dispatch(setLoadingUsers(id))
    axios
      .patch(`${base}/${id}/`, data, )//{ headers: { Authorization: token } })
      .then((response) => dispatch(updateUser(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors))
  }
}

let base = "users";

export default UsersApi;

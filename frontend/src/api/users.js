import React from "react";
import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
  setLoadingUsers,
  setUser,
  updateUser,
} from "../redux/usersSlice";
import { handleErrors } from "./errors";
import {toast} from "react-toastify";
import {toastParams} from "./auth";
import Cookie from "js-cookie";
import {login} from "../redux/authSlice";


class UsersApi {
  static changePassword = (token, id, data) => dispatch => {
    dispatch(setLoadingUsers(id))
    axios
      .put(`${base}/${id}/change-password`, data,{headers: {Authorization: token}})
      .then(response => {
        dispatch(setUser(response.data))
        toast.success(<span>Password updated successfully!</span>, toastParams)
      })
      .catch(error => handleErrors(error, dispatch, setErrors))
  }
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
      .get(`${base}/${id}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setUser(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
  static updateUser = (token, id, data, me = false) => dispatch => {
    dispatch(setLoadingUsers(id))
    axios
      .patch(`${base}/${id}`, data, { headers: { Authorization: token } })
      .then((response) => {
        if (me) {
          Cookie.set("user", JSON.stringify(response.data))
          dispatch(login({token, user: response.data}))
        }
        dispatch(updateUser(response.data))
        toast.success(<span><b>{response.data.username}</b> updated successfully!</span>, toastParams)
      })
      .catch((err) => handleErrors(err, dispatch, setErrors))
  }
}

let base = "users";

export default UsersApi;

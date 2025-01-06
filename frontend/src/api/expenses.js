import axios from "./index";
import {
  create as createExpense,
  set as setExpenses,
  setErrors as setExpensesErrors,
  setItem as setExpense,
  setLoading as setExpensesLoading,
  setLoadingItems as setLoadingExpenses,
  update as updateExpense,
} from "../redux/expensesSlice";
import {
  create as createGroup,
  deleteItem as deleteGroup,
  set as setGroups,
  setErrors as setGroupsErrors,
  setLoading as setGroupsLoading,
} from "../redux/groupsSlice";
import { handleErrors } from "./errors";
import { createSearchParams } from "./shared";
import { toast } from "react-toastify";
import { toastParams } from "./auth";


export class ExpensesApi {
  static create = (token, data) => dispatch => {
    dispatch(setExpensesLoading(true));
    axios
      .post(`${base}/expenses/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(createExpense(response.data))
        toast.success("Expense created successfully!", toastParams)
      })
      .catch((err) => handleErrors(err, dispatch, setExpensesErrors));
  };
  static get = (token, expenseId) => dispatch => {
    dispatch(setLoadingExpenses(expenseId));
    axios
      .get(`${base}/expenses/${expenseId}/`, { headers: { Authorization: token } })
      .then((response) => dispatch(setExpense(response.data)))
      .catch((err) => handleErrors(err, dispatch, setExpensesErrors));
  };
  static getList = (token, kwargs) => dispatch => {
    dispatch(setExpensesLoading(true));
    const searchParams = kwargs ? `?${createSearchParams(kwargs)}` : ""
    axios
      .get(`${base}/expenses/${searchParams}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setExpenses(response.data)))
      .catch((err) => handleErrors(err, dispatch, setExpensesErrors));
  };
  static update = (token, expenseId, data) => dispatch => {
    dispatch(setLoadingExpenses(expenseId));
    axios
      .patch(`${base}/expenses/${expenseId}/`, data, { headers: { Authorization: token } })
      .then((response) => {
        dispatch(updateExpense(response.data))
        toast.success("Expense updated successfully!", toastParams)
      })
      .catch((err) => handleErrors(err, dispatch, setExpensesErrors));
  };
}

export class GroupsApi {
  static create = (token, groupName) => dispatch => {
    dispatch(setGroupsLoading(true));
    axios
      .post(`${base}/groups/`, {name: groupName}, { headers: { Authorization: token } })
      .then(response => dispatch(createGroup(response.data)))
      .catch((err) => handleErrors(err, dispatch, setGroupsErrors));
  }
  static deleteGroup = (token, groupId) => dispatch => {
    dispatch(setGroupsLoading(true));
    axios
      .delete(`${base}/groups/${groupId}/`, { headers: { Authorization: token } })
      .then(() => dispatch(deleteGroup(groupId)))
      .catch((err) => handleErrors(err, dispatch, setGroupsErrors));
  }
  static getList = (token, kwargs) => dispatch => {
    dispatch(setGroupsLoading(true));
    const searchParams = kwargs ? `?${createSearchParams(kwargs)}` : ""
    axios
      .get(`${base}/groups/${searchParams}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setGroups(response.data)))
      .catch((err) => handleErrors(err, dispatch, setGroupsErrors));
  };
  static inviteUser = (token, groupId, emailOrUsername, isEmail = true) => dispatch => {
    const data = {[isEmail ? "email" : "username"]: emailOrUsername}
    dispatch(setGroupsLoading(true))
    axios
      .put(`${base}/groups/${groupId}/invite/`, data, { headers: { Authorization: token } })
      .then((response) => dispatch(setGroups(response.data)))
      .catch((err) => {
        handleErrors(err, dispatch, setGroupsErrors)
        toast.error(err, toastParams)

      });
  }
  static removeUserFromGroup = (token, groupId, userId) => dispatch => {
    dispatch(setGroupsLoading(true))
    axios
      .put(`${base}/groups/${groupId}/remove-user/`, {id: userId}, { headers: { Authorization: token } })
      .then((response) => dispatch(setGroups(response.data)))
      .catch((err) => {
        handleErrors(err, dispatch, setGroupsErrors)
        toast.error(err, toastParams)

      });
  }
}

const base = "split"
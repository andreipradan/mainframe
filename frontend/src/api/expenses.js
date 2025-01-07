import axios from "./index";
import {
  create as createExpense,
  set as setExpenses,
  setErrors as setExpensesErrors,
  setLoading as setExpensesLoading,
  setLoadingItems as setExpensesLoadingItems,
  update as updateExpense,
} from "../redux/expensesSlice";
import {
  create as createGroup,
  deleteItem as deleteGroup,
  set as setGroups,
  setErrors as setGroupsErrors,
  setLoading as setGroupsLoading,
  setLoadingItems as setGroupsLoadingItems,
} from "../redux/groupsSlice";
import { handleErrors } from "./errors";
import { CreateApi, DeleteApi, DetailApi, ListApi, mix, TokenMixin, UpdateApi } from './shared';
import { toast } from "react-toastify";
import { toastParams } from "./auth";


export class ExpensesApi extends mix(CreateApi, DetailApi, ListApi, TokenMixin, UpdateApi) {
  static baseUrl = "split/expenses"
  static methods = {
    create: createExpense,
    set: setExpenses,
    setErrors: setExpensesErrors,
    setLoading: setExpensesLoading,
    setLoadingItems: setExpensesLoadingItems,
    update: updateExpense,
  }
}

export class GroupsApi extends mix(CreateApi, DeleteApi, DetailApi, ListApi, TokenMixin) {
  static baseUrl = "split/groups"
  static displayField = "name"
  static methods = {
    create: createGroup,
    delete: deleteGroup,
    set: setGroups,
    setErrors: setGroupsErrors,
    setLoading: setGroupsLoading,
    setLoadingItems: setGroupsLoadingItems,
  }
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
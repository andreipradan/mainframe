import axios from "./index";
import {
  create as createCars,
  deleteItem as deleteCars,
  set as setCars,
  setCompletedLoadingItem as setCarsCompletedLoadingItem,
  setErrors as setCarsErrors,
  setLoading as setCarsLoading,
  setLoadingItems as setCarsLoadingItems,
  update as updateCars,
} from "../redux/carSlice"
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
  setCompletedLoadingItem as setGroupsCompletedLoadingItem,
  setErrors as setGroupsErrors,
  setLoading as setGroupsLoading,
  setLoadingItems as setGroupsLoadingItems,
} from "../redux/groupsSlice";
import { handleErrors } from "./errors";
import { CreateApi, DeleteApi, DetailApi, ListApi, mix, TokenMixin, UpdateApi } from './shared';
import { toast } from "react-toastify";
import { toastParams } from "./auth";


export class CarApi extends mix(CreateApi, DeleteApi, ListApi, TokenMixin, UpdateApi) {
  static baseUrl = "/expenses/cars";
  static methods = {
    create: createCars,
    delete: deleteCars,
    set: setCars,
    setCompletedLoadingItem: setCarsCompletedLoadingItem,
    setErrors: setCarsErrors,
    setLoading: setCarsLoading,
    setLoadingItems: setCarsLoadingItems,
    update: updateCars,
  }
  createServiceEntry = (parentId, data) => dispatch => {
    dispatch(this.constructor.methods.setLoading(true))
    axios
      .post(
        `${this.constructor.baseUrl}/${parentId}/service-entries/`,
        data,
        { headers: { Authorization: this.token } },
      )
      .then(response => {
        dispatch(this.constructor.methods.create(response.data))
        toast.success(`Service entry for '${response.data.name}' on '${data.date}' created successfully!`, toastParams);
      })
      .catch(err => handleErrors(err, dispatch, this.constructor.methods.setErrors))
  }
  deleteServiceEntry = (parentId, id) => dispatch => {
    dispatch(this.constructor.methods.setLoadingItems(parentId))
    axios
      .patch(
        `${this.constructor.baseUrl}/${parentId}/service-entries/`,
        {service_entry_id: id},
         {headers: { Authorization: this.token } },
      )
    .then(response => {
      dispatch(this.constructor.methods.create(response.data))
      toast.warning(`Service entry for ${response.data.name} deleted successfully!`, toastParams);
    })
    .catch(err => handleErrors(err, dispatch, this.constructor.methods.setErrors))
  }
}

export class ExpensesApi extends mix(CreateApi, DetailApi, ListApi, TokenMixin, UpdateApi) {
  static baseUrl = "/expenses/my"
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
  static baseUrl = "/expenses/groups"
  static methods = {
    create: createGroup,
    delete: deleteGroup,
    set: setGroups,
    setCompletedLoadingItem: setGroupsCompletedLoadingItem,
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
        handleErrors(err, dispatch, setGroupsErrors, setGroupsLoading)
        toast.error(err, toastParams)

      });
  }
  static removeUserFromGroup = (token, groupId, userId) => dispatch => {
    dispatch(setGroupsLoading(true))
    axios
      .put(`${base}/groups/${groupId}/remove-user/`, {id: userId}, { headers: { Authorization: token } })
      .then((response) => dispatch(setGroups(response.data)))
      .catch((err) => {
        handleErrors(err, dispatch, setGroupsErrors, setGroupsLoading)
        toast.error(err, toastParams)

      });
  }
}

const base = "split"
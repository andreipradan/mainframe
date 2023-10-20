import axios from "./index";
import {
  create as createGroup,
  deleteItem as deleteGroup,
  set as setGroups,
  setErrors as setGroupsErrors,
  setLoading as setGroupsLoading,
} from "../redux/groupsSlice";
import { handleErrors } from "./errors";
import { createSearchParams } from "./finance";
import { toast } from "react-toastify";
import { toastParams } from "./auth";


export class GroupsApi {
  static create = (token, groupName) => dispatch => {
    dispatch(setGroupsLoading(true));
    axios
      .post(`groups/`, {name: groupName}, { headers: { Authorization: token } })
      .then(response => dispatch(createGroup(response.data)))
      .catch((err) => handleErrors(err, dispatch, setGroupsErrors));
  }
  static deleteGroup = (token, groupId) => dispatch => {
    dispatch(setGroupsLoading(true));
    axios
      .delete(`groups/${groupId}/`, { headers: { Authorization: token } })
      .then(() => dispatch(deleteGroup(groupId)))
      .catch((err) => handleErrors(err, dispatch, setGroupsErrors));
  }
  static getList = (token, kwargs) => dispatch => {
    dispatch(setGroupsLoading(true));
    const searchParams = kwargs ? `?${createSearchParams(kwargs)}` : ""
    axios
      .get(`groups/${searchParams}`, { headers: { Authorization: token } })
      .then((response) => dispatch(setGroups(response.data)))
      .catch((err) => handleErrors(err, dispatch, setGroupsErrors));
  };
  static inviteUser = (token, groupId, email) => dispatch => {
    dispatch(setGroupsLoading(true))
    axios
      .put(`groups/${groupId}/invite/`, {email: email}, { headers: { Authorization: token } })
      .then((response) => dispatch(setGroups(response.data)))
      .catch((err) => {
        handleErrors(err, dispatch, setGroupsErrors)
        toast.error(err, toastParams)

      });
  }
  static removeUserFromGroup = (token, groupId, userId) => dispatch => {
    dispatch(setGroupsLoading(true))
    axios
      .put(`groups/${groupId}/remove-user/`, {id: userId}, { headers: { Authorization: token } })
      .then((response) => dispatch(setGroups(response.data)))
      .catch((err) => {
        handleErrors(err, dispatch, setGroupsErrors)
        toast.error(err, toastParams)

      });
  }
}

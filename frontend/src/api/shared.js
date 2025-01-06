import axios from './index';
import { handleErrors } from './errors';
import { toast } from 'react-toastify';
import { toastParams } from './auth';


export const createSearchParams = params => {
  if (params === null) return ""
  return new URLSearchParams(
    Object.entries(params).flatMap(([key, values]) =>
      Array.isArray(values)
        ? values.map((value) => [key, value])
        : [[key, values]]
    )
  )
}

export class Api {
  constructor(token) {this.token = token}

  create = data => dispatch => {
    dispatch(this.setLoading(true))
    axios
      .post(`${this.baseUrl}/`, data, { headers: {Authorization: this.token} })
      .then(response => dispatch(this.createMethod(response.data)))
      .catch(err => handleErrors(err, dispatch, this.setErrors))
  }

  getItem = id => dispatch => {
    dispatch(this.setLoadingItems(id));
    axios
      .get(`${this.baseUrl}/${id}/`, { headers: { Authorization: this.token } })
      .then((response) => dispatch(this.updateMethod(response.data)))
      .catch((err) => handleErrors(err, dispatch, this.setErrors));
  };
  getList = (kwargs = null) => (dispatch) => {
    dispatch(this.setLoading());
    axios
      .get(
        `${this.baseUrl}/?${createSearchParams(kwargs)}`,
        {headers: { Authorization: this.token }})
      .then(response => dispatch(this.set(response.data)))
      .catch(err => handleErrors(err, dispatch, this.setErrors));
  };
  update = (id, data) => dispatch => {
    dispatch(this.setLoadingItems(id));
    axios
      .patch(`${this.baseUrl}/${id}/`, data, { headers: { Authorization: this.token } })
      .then((response) => {
        dispatch(this.updateMethod(response.data));
      })
      .catch((err) => handleErrors(err, dispatch, this.setErrors));
  };

  upload = data => dispatch => {
    dispatch(this.setLoading());
    axios
      .post(
        `${this.baseUrl}/`,
        data,
        {headers: {Authorization: this.token, 'Content-Type': 'multipart/form-data'}})
      .then(response=> {
        dispatch(this.set(response.data));
        const components = this.baseUrl.split("/")
        const resource = components[components.length - 1]
        toast.success(`${resource[0].toUpperCase() + resource.slice(1)} uploaded successfully!`, toastParams);
      })
      .catch(err => handleErrors(err, dispatch, this.setErrors));
  };
}

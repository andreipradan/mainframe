import axios, { ngrokAxios } from './index';
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

const getAxios = (method, ngrokAxiosList) => ngrokAxiosList?.includes(method) ? ngrokAxios : axios

const getDisplayName = (constructor, data) => {
  if (constructor.displayField)
    return data[constructor.displayField] || data.id

  if (!constructor.displayFields?.length) return data.id
  for (const field of constructor.displayFields) {
    if (data[field]) return data[field]
  }
  return data.id
}

const getResource = baseUrl => {
  const components = baseUrl.split('/')
  const resource = components[components.length - 1]
  return `${resource[0].toUpperCase()}${resource.slice(1, resource.length - 1)}`
}

export const mix = (...mixins) => {
  if (!mixins.includes(TokenMixin))
    throw new Error("All Api classes must inherit from TokenMixin")
  return mixins.reduce((Base, Mixin) => Mixin(Base), Object);
}

export const TokenMixin = Base => class extends Base {
  constructor(token) {
    super();
    this.token = token;
    if (this.constructor.baseUrl === undefined) {
      throw new Error(`${this.constructor.name} class must implement the static 'baseUrl' attribute`);
    }
    if (this.constructor.methods === undefined) {
      throw new Error(`${this.constructor.name} class must implement the static 'methods' object`);
    }
    ["set", "setErrors", "setLoading"].forEach(method => {
      if (typeof this.constructor.methods[method] !== "function") {
        throw new Error(`'${method}' is missing from the ${this.constructor.name}.methods object.`);
      }
    })
  }
}

export const CreateApi = Base => class extends Base {
  constructor(token) {
    super(token);
    ["create", "setLoadingItems"].forEach(method => {
      if (typeof this.constructor?.methods?.[method] !== "function") {
        throw new Error(`'${method}' is missing from the ${this.constructor.name}.methods object.`);
      }
    })
  }

  create = data => dispatch => {
    dispatch(this.constructor.methods.setLoading(true))
    axios
      .post(`${this.constructor.baseUrl}/`, data, { headers: { Authorization: this.token } })
      .then(response => {
        dispatch(this.constructor.methods.create(response.data))
        const displayField = getDisplayName(this.constructor, response.data)
        toast.success(`${getResource(this.constructor.baseUrl)} ${displayField} created successfully!`, toastParams);
      })
      .catch(err => handleErrors(err, dispatch, this.constructor.methods.setErrors))
  }

}

export const DeleteApi = Base => class extends Base {
  constructor(token) {
    super(token);
    if (typeof this.constructor.methods.delete !== "function") {
      throw new Error(`'delete' is missing from the ${this.constructor.name}.methods object`);
    }
  }

  delete = id => dispatch => {
    dispatch(this.constructor.methods.setLoadingItems(id));
    axios
      .delete(`${this.constructor.baseUrl}/${id}/`, { headers: { Authorization: this.token } })
      .then(() => {
        dispatch(this.constructor.methods.delete(id));
        toast.error(`${getResource(this.constructor.baseUrl)} ${id} deleted successfully!`, toastParams);
      })
      .catch((err) => handleErrors(err, dispatch, this.constructor.methods.setErrors));
  }
}

export const DetailApi = Base => class extends Base {
  getItem = id => dispatch => {
    dispatch(this.constructor.methods.setLoadingItems(id));
    axios
      .get(`${this.constructor.baseUrl}/${id}/`, { headers: { Authorization: this.token } })
      .then((response) => dispatch(this.constructor.methods.update({ ...response.data, dontClearSelectedItem: true })))
      .catch((err) => handleErrors(err, dispatch, this.constructor.methods.setErrors));
  };
}

export const ListApi = Base => class extends Base {
  getList = (kwargs = null) => dispatch => {
    dispatch(this.constructor.methods.setLoading());
    const axios = getAxios("getList", this.constructor.ngrokAxios)
    axios
      .get(
        `${this.constructor.baseUrl}/?${createSearchParams(kwargs)}`,
        {headers: { Authorization: this.token }})
      .then(response => dispatch(this.constructor.methods.set(response.data)))
      .catch(err => handleErrors(err, dispatch, this.constructor.methods.setErrors));
  };
}

export const RunApi = Base => class extends Base {
  run = (id, data) => dispatch => {
    dispatch(this.constructor.methods.setLoading());
    axios
      .put(`${this.constructor.baseUrl}/${id}/run/`, data, { headers: { Authorization: this.token } })
      .then(() => {
        toast.success(`"${id}" executed successfully!`, toastParams)
        dispatch(this.constructor.methods.setLoading(false))
        dispatch(this.constructor.methods.setErrors(null))
      })
      .catch((err) => handleErrors(err, dispatch, this.constructor.methods.setErrors))
  };
}

export const UpdateApi = Base => class extends Base {
  constructor(token) {
    super(token);
    ["setLoadingItems", "update"].forEach(method => {
      if (typeof this.constructor.methods[method] !== "function") {
        throw new Error(`'${method}' is missing from the ${this.constructor.name}.methods object.`);
      }
    })
  }
  update = (id, data) => dispatch => {
    dispatch(this.constructor.methods.setLoadingItems(id));
    axios
      .patch(`${this.constructor.baseUrl}/${id}/`, data, { headers: { Authorization: this.token } })
      .then(response => {
        dispatch(this.constructor.methods.update({ ...response.data, dontClearSelectedItem: true }))
        const displayField = getDisplayName(this.constructor, response.data)
        toast.info(`${getResource(this.constructor.baseUrl)} "${displayField}" updated successfully!`, toastParams);
      })
      .catch((err) => handleErrors(err, dispatch, this.constructor.methods.setErrors));
  };
}

export const UploadApi = Base => class extends Base {
  upload = data => dispatch => {
    dispatch(this.constructor.methods.setLoading());
    axios
      .post(
        `${this.constructor.baseUrl}/`,
        data,
        {headers: {Authorization: this.token, 'Content-Type': 'multipart/form-data'}})
      .then(response=> {
        dispatch(this.constructor.methods.set(response.data));
        toast.success(`${getResource(this.constructor.baseUrl)} uploaded successfully!`, toastParams);
      })
      .catch(err => handleErrors(err, dispatch, this.constructor.methods.setErrors));
  };
}
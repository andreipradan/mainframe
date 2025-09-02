import axios from './index';
import {
  set,
  setErrors,
  setLoading,
} from "../redux/transitSlice";

import { handleErrors } from "./errors";
import { mix, TokenMixin } from './shared';


export class TransitApi extends mix(TokenMixin) {
  static baseUrl = "transit"
  static methods = {
    set,
    setErrors,
    setLoading,
  }
  getList = (what, etag) => dispatch => {
    dispatch(this.constructor.methods.setLoading());
    const headers = { Authorization: this.token}
    if (etag) headers["If-None-Match"] = etag
    const now = new Date()
    axios
      .get(`${this.constructor.baseUrl}/?entity=${what}`, { headers })
      .then(
        response => {
          dispatch(this.constructor.methods.set(
            {
              ...response.data,
              [`${what}_etag`]: response.headers.get("ETag"),
              [`${what}_last_update`]: now.toISOString(),
            }
          ))
        })
      .catch(
        err => {
          if (err.response?.status !== 304)
            handleErrors(err, dispatch, this.constructor.methods.setErrors, this.constructor.methods.setLoading)
        })
      .finally(() => {
        dispatch(this.constructor.methods.set({
          [`${what}_last_check`]: now.toISOString()
        }))
      })
  }
}

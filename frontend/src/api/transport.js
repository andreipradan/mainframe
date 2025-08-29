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
    axios
      .get(`${this.constructor.baseUrl}/?entity=${what}`, { headers })
      .then(
        response => dispatch(this.constructor.methods.set(
          {
            ...response.data,
            last_update: new Date().toISOString(),
            last_check: new Date().toLocaleString(),
          }
        )))
      .catch(
        err => {
          if (err.response?.status !== 304)
            handleErrors(err, dispatch, this.constructor.methods.setErrors, this.constructor.methods.setLoading)
          else
            dispatch(this.constructor.methods.set({last_check: new Date().toLocaleString()}))
        }
      );
  };
}

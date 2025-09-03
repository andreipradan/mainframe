import axios from './index';
import { set, setErrors, setLoading, setOnly } from '../redux/transitSlice';

import { handleErrors } from './errors';

export class TransitApi {
  constructor(token) {
    this.token = token;
  }

  getList = (what, etag) => (dispatch) => {
    if (what === 'vehicles') dispatch(setLoading());
    const headers = { Authorization: this.token };
    if (etag) headers['If-None-Match'] = etag;
    const now = new Date();
    axios
      .get(`transit/?entity=${what}`, { headers })
      .then((response) => {
        if (what === 'vehicles')
          dispatch(
            set({
              ...response.data,
              [`${what}_etag`]: response.headers.get('ETag'),
              [`${what}_last_update`]: now.toISOString(),
            })
          );
        else dispatch(setOnly(response.data));
      })
      .catch((err) => {
        if (err.response?.status !== 304)
          handleErrors(err, dispatch, setErrors, setLoading);
        else dispatch(setLoading(false));
      })
      .finally(() => {
        dispatch(setOnly({ [`${what}_last_check`]: now.toISOString() }));
      });
  };
}

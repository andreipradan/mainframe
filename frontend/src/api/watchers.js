import axios, { ngrokAxios } from './index';
import {
  create,
  deleteItem,
  set,
  setCompletedLoadingItem,
  setItem,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from '../redux/watchersSlice';
import { handleErrors } from './errors';
import { toast } from 'react-toastify';
import { toastParams } from './auth';
import {
  CreateApi,
  DeleteApi,
  DetailApi,
  ListApi,
  mix,
  TokenMixin,
  UpdateApi,
} from './shared';

class WatchersApi extends mix(
  CreateApi,
  DeleteApi,
  DetailApi,
  ListApi,
  TokenMixin,
  UpdateApi
) {
  static baseUrl = 'watchers';
  static methods = {
    create,
    delete: deleteItem,
    set,
    setCompletedLoadingItem,
    setErrors,
    setLoading,
    setLoadingItems,
    update,
  };
  static run = (token, id) => (dispatch) => {
    dispatch(setLoadingItems(id));
    ngrokAxios
      .put(`${base}${id}/run/`, {}, { headers: { Authorization: token } })
      .then((response) => {
        if (Object.keys(response.data).length) {
          toast.success('Found new items!', toastParams);
          dispatch(setItem(response.data));
        } else toast.warning('No new items found', toastParams);
        dispatch(setCompletedLoadingItem(id));
      })
      .catch((err) => {
        dispatch(setCompletedLoadingItem(id));
        handleErrors(err, dispatch, setErrors);
      });
  };
  static test = (token, data) => (dispatch) => {
    dispatch(setLoading(true));
    axios
      .put(`${base}test/`, data, { headers: { Authorization: token } })
      .then((response) => {
        const newResults = Boolean(response.data.results?.length);
        toast[newResults ? 'warning' : 'info'](
          <span>
            {newResults ? 'New item found!' : 'Nothing new'}
            <br />
            <ul>
              {response.data.results.map((result) => (
                <li>
                  <a href={result.url} target='_blank' rel='noreferrer'>
                    {result.title}
                  </a>
                </li>
              ))}
            </ul>
          </span>,
          toastParams
        );
        dispatch(setLoading(false));
      })
      .catch((err) => handleErrors(err, dispatch, setErrors, setLoading));
  };
}

const base = 'watchers/';

export default WatchersApi;

import axios from "./index";
import {
  create,
  set,
  setCompletedLoadingItem,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from "../redux/botsSlice";

import { handleErrors } from "./errors";
import { CreateApi, DetailApi, ListApi, mix, UpdateApi, TokenMixin} from './shared';


class BotsApi extends mix(CreateApi, DetailApi, ListApi, TokenMixin, UpdateApi) {
  static baseUrl = "telegram/bots"
  static displayField = "full_name"
  static methods = {create, set, setErrors, setLoading, setLoadingItems, update}

  sync = botId => dispatch => {
    dispatch(setLoadingItems(botId));
    axios
      .put(`${this.constructor.baseUrl}/${botId}/sync/`, {}, { headers: { Authorization: this.token } })
      .then((response) => dispatch(update(response.data)))
      .catch((err) => {
        dispatch(setCompletedLoadingItem(botId))
        handleErrors(err, dispatch, setErrors);
      });
  };
}

export default BotsApi;

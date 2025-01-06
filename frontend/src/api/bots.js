import axios from "./index";
import {
  create,
  set,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from "../redux/botsSlice";

import {handleErrors} from "./errors";
import { Api } from './shared';


class BotsApi extends Api {
  baseUrl = "telegram/bots"
  createMethod = create
  set = set
  setErrors = setErrors
  setLoading = setLoading
  setLoadingItems = setLoadingItems
  updateMethod = update

  sync = botId => dispatch => {
    dispatch(setLoadingItems(botId));
    axios
      .put(`${this.baseUrl}/${botId}/sync/`, {}, { headers: { Authorization: this.token } })
      .then((response) => dispatch(update(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

export default BotsApi;

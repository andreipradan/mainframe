import {
  create,
  set,
  setCompletedLoadingItem,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from "../redux/botsSlice";

import { CreateApi, DetailApi, ListApi, mix, UpdateApi, TokenMixin} from './shared';


class BotsApi extends mix(CreateApi, DetailApi, ListApi, TokenMixin, UpdateApi) {
  static baseUrl = "telegram/bots"
  static displayField = "full_name"
  static methods = {
    create,
    set,
    setCompletedLoadingItem,
    setErrors,
    setLoading,
    setLoadingItems,
    update
  }

}

export default BotsApi;

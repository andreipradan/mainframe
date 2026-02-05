import { ngrokAxios } from "./index";
import {
  create,
  deleteItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from "../redux/devicesSlice";
import { handleErrors } from "./errors";
import { CreateApi, DeleteApi, ListApi, mix, TokenMixin, UpdateApi } from './shared';

class DevicesApi extends mix(CreateApi, DeleteApi, ListApi, TokenMixin, UpdateApi) {
  static baseUrl = "devices"
  static displayFields = ["alias", "name", "ip", "mac"]
  static methods = {
    create,
    delete: deleteItem,
    set,
    setCompletedLoadingItem,
    setErrors,
    setLoading,
    setLoadingItems,
    update
  }

  static sync = token => dispatch => {
    dispatch(setLoading(true));
    ngrokAxios
      .put("devices/sync/", {}, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors, setLoading));
  };
}
export default DevicesApi;

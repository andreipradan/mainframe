import axios from "./index";
import {
  set,
  setErrors,
  setLoading,
} from "../redux/earthquakesSlice";
import { handleErrors } from "./errors";
import { createSearchParams } from "./finance";


class EarthquakesApi {
  static getList = (token, kwargs) => (dispatch) => {
    dispatch(setLoading(true));
    kwargs = kwargs || {};
    axios
      .get(base + `?${createSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}

let base = "earthquakes/";

export default EarthquakesApi;

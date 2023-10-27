import axios from "./index";
import { handleErrors } from "./errors";
import { createSearchParams } from "./finance";
import { set, setErrors, setLoading } from "../redux/exchangeSlice";

export class ExchangeApi {
  static getRates = (token, kwargs = null) => (dispatch) => {
    dispatch(setLoading(true));
    kwargs = kwargs || {};
    axios
      .get(`${base}/rates/?${createSearchParams(kwargs)}`, { headers: { Authorization: token } })
      .then((response) => dispatch(set(response.data)))
      .catch((err) => handleErrors(err, dispatch, setErrors));
  };
}
const base = "exchange"

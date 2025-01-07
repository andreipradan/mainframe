import { set, setErrors, setLoading } from "../redux/exchangeSlice";
import { ListApi, mix, TokenMixin } from './shared';

export class ExchangeApi extends mix(ListApi, TokenMixin) {
  static baseUrl = "exchange"
  static methods = {set, setErrors, setLoading};
}
export default ExchangeApi;
import { set, setErrors, setLoading } from "../redux/earthquakesSlice";
import { ListApi, mix, TokenMixin } from './shared';

class EarthquakesApi extends mix(ListApi, TokenMixin){
  static baseUrl = "earthquakes"
  static methods = {set, setErrors, setLoading}
}
export default EarthquakesApi;

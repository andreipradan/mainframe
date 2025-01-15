import { set, setErrors, setLoading } from "../redux/activitySlice";
import { ListApi, mix, TokenMixin } from './shared';

export default class ActivityApi extends mix(ListApi, TokenMixin) {
  static baseUrl = "activity"
  static methods = {set, setErrors, setLoading}
}

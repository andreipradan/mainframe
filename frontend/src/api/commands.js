import { set, setErrors, setLoading } from "../redux/commandsSlice";
import { ListApi, mix, RunApi, TokenMixin } from './shared';

class CommandsApi extends mix(ListApi, RunApi, TokenMixin) {
  static baseUrl = "commands"
  static methods = { set, setErrors, setLoading }
}

export default CommandsApi;

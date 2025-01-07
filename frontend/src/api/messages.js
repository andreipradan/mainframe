import { set, setErrors, setLoading } from "../redux/messagesSlice"
import { ListApi, mix, TokenMixin } from './shared';

class MessagesApi extends mix(ListApi, TokenMixin) {
  static baseUrl = "telegram/messages"
  static methods = {set, setErrors, setLoading}
}
export default MessagesApi;

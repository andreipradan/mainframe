import {
  create,
  deleteItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from '../redux/sourcesSlice';
import { CreateApi, DeleteApi, ListApi, mix, TokenMixin, UpdateApi } from './shared';


class SourcesApi extends mix(CreateApi, DeleteApi, ListApi, TokenMixin, UpdateApi) {
  static baseUrl = "sources"
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
}
export default SourcesApi;

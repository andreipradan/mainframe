import {
  CreateApi,
  DeleteApi,
  ListApi,
  mix,
  TokenMixin,
  UpdateApi,
} from './shared';
import {
  create,
  deleteItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from '../redux/favoritesSlice';

class FavoritesApi extends mix(
  CreateApi,
  DeleteApi,
  ListApi,
  TokenMixin,
  UpdateApi
) {
  static baseUrl = 'sources';
  static methods = {
    create,
    delete: deleteItem,
    set,
    setCompletedLoadingItem,
    setErrors,
    setLoading,
    setLoadingItems,
    update,
  };
}

export default FavoritesApi;

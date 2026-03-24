import {
  create,
  deleteItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from '../redux/eventsSlice';
import {
  CreateApi,
  DeleteApi,
  ListApi,
  mix,
  TokenMixin,
  UpdateApi,
} from './shared';

class EventsApi extends mix(
  CreateApi,
  DeleteApi,
  ListApi,
  TokenMixin,
  UpdateApi
) {
  static baseUrl = 'events';
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

export default EventsApi;

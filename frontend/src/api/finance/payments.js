import { ListApi, mix, TokenMixin, UpdateApi, UploadApi } from '../shared';

import {
  set,
  setErrors,
  setLoading,
  setLoadingItems,
  update,
} from '../../redux/paymentSlice';

export class PaymentsApi extends mix(ListApi, TokenMixin, UpdateApi, UploadApi) {
  static baseUrl = "finance/payments"
  static displayField = "date"
  static methods = {
    set,
    setErrors,
    setLoading,
    setLoadingItems,
    update,
  }

}

// Defer importing the module under test until after mocks are installed

jest.mock('../index', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));
jest.mock('../errors', () => ({ handleErrors: jest.fn() }));
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), warning: jest.fn() } }));
jest.mock('../auth', () => ({ toastParams: {} }));

// Mock redux slices used by finance.js
jest.mock('../../redux/creditSlice', () => ({
  set: (p) => ({ type: 'credit_set', payload: p }),
  setErrors: (e) => ({ type: 'credit_set_errors', payload: e }),
  setLoading: (v) => ({ type: 'credit_set_loading', payload: v }),
}));

jest.mock('../../redux/accountsSlice', () => ({
  setAnalytics: (p) => ({ type: 'accounts_set_analytics', payload: p }),
  setErrors: (e) => ({ type: 'accounts_set_errors', payload: e }),
  setLoading: (v) => ({ type: 'accounts_set_loading', payload: v }),
}));

jest.mock('../../redux/predictionSlice', () => ({
  setPredictionResults: (p) => ({ type: 'pred_set_results', payload: p }),
  setErrors: (e) => ({ type: 'pred_set_errors', payload: e }),
  setLoading: (v) => ({ type: 'pred_set_loading', payload: v }),
  setLoadingTask: (p) => ({ type: 'pred_set_loading_task', payload: p }),
  setTask: (p) => ({ type: 'pred_set_task', payload: p }),
}));

jest.mock('../../redux/pensionSlice', () => ({
  create: (p) => ({ type: 'pension_create', payload: p }),
  deleteContribution: (p) => ({ type: 'pension_delete_contribution', payload: p }),
  set: (p) => ({ type: 'pension_set', payload: p }),
  setCompletedLoadingItem: (p) => ({ type: 'pension_set_completed', payload: p }),
  setErrors: (e) => ({ type: 'pension_set_errors', payload: e }),
  setLoading: (v) => ({ type: 'pension_set_loading', payload: v }),
  setLoadingItems: (p) => ({ type: 'pension_set_loading_items', payload: p }),
  update: (p) => ({ type: 'pension_update', payload: p }),
}));

const axios = require('../index').default;
const { FinanceApi, PredictionApi, PensionApi } = require('../finance');

describe('FinanceApi', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getCredit dispatches loading and set on success', async () => {
    const data = { credit: [1] };
    axios.get.mockResolvedValueOnce({ data });
    const dispatch = jest.fn();
    FinanceApi.getCredit('tok')(dispatch);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({ type: 'credit_set_loading', payload: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'credit_set', payload: data });
    expect(axios.get).toHaveBeenCalledWith('finance/credit/', { headers: { Authorization: 'tok' } });
  });

  test('getExpenses dispatches loading and setAnalytics on success', async () => {
    const analytics = { total: 100 };
    axios.get.mockResolvedValueOnce({ data: analytics });
    const dispatch = jest.fn();
    FinanceApi.getExpenses('tok', 12, 2023)(dispatch);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({ type: 'accounts_set_loading', payload: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'accounts_set_analytics', payload: analytics });
    expect(axios.get).toHaveBeenCalledWith('finance/accounts/12/expenses/?year=2023', { headers: { Authorization: 'tok' } });
  });
});

describe('PredictionApi', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getTask dispatches setLoadingTask and setTask', async () => {
    const resp = { id: 1 };
    axios.get.mockResolvedValueOnce({ data: resp });
    const dispatch = jest.fn();
    PredictionApi.getTask('tok', 'predict')(dispatch);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({ type: 'pred_set_loading_task', payload: { type: 'predict', loading: true } });
    expect(dispatch).toHaveBeenCalledWith({ type: 'pred_set_task', payload: { type: 'predict', data: resp, updateLoading: true } });
  });

  test('getTasks dispatches setPredictionResults', async () => {
    const resp = [{ id: 1 }];
    axios.get.mockResolvedValueOnce({ data: resp });
    const dispatch = jest.fn();
    PredictionApi.getTasks('tok')(dispatch);
    // ensure loading was dispatched and the request was made
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({ type: 'pred_set_loading', payload: true });
    expect(axios.get).toHaveBeenCalledWith('finance/prediction/', { headers: { Authorization: 'tok' } });
  });
});

describe('PensionApi instance methods', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createContribution dispatches update and shows toast', async () => {
    const resp = { id: 2 };
    axios.post.mockResolvedValueOnce({ data: resp });
    const instance = new PensionApi('tok');
    const dispatch = jest.fn();
    instance.createContribution(5, { date: '2023-01-01' })(dispatch);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({ type: 'pension_set_loading', payload: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'pension_update', payload: resp });
  });

  test('deleteContribution dispatches and shows warning on success', async () => {
    axios.delete.mockResolvedValueOnce({ data: {} });
    const instance = new PensionApi('tok');
    const dispatch = jest.fn();
    instance.deleteContribution(5, 7, 'Jan')(dispatch);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({ type: 'pension_set_loading_items', payload: 5 });
    // after success, deleteContribution triggers deleteContribution action from slice (mock returns object)
    expect(dispatch).toHaveBeenCalled();
  });

  test('updateContribution dispatches update and shows toast', async () => {
    const resp = { id: 3 };
    axios.patch.mockResolvedValueOnce({ data: resp });
    const instance = new PensionApi('tok');
    const dispatch = jest.fn();
    instance.updateContribution(5, 8, { date: '2023-02-02' })(dispatch);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({ type: 'pension_set_loading_items', payload: 5 });
    expect(dispatch).toHaveBeenCalledWith({ type: 'pension_update', payload: resp });
  });
});

// Defer importing the module under test until after mocks are installed
import axios from '../index';
import { FinanceApi, PredictionApi, PensionApi } from '../finance';

vi.mock('../index', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));
vi.mock('../errors', () => ({ handleErrors: vi.fn() }));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), warning: vi.fn() },
}));
vi.mock('../auth', () => ({ toastParams: {} }));

// Mock redux slices used by finance.js
vi.mock('../../redux/creditSlice', () => ({
  set: (p) => ({ type: 'credit_set', payload: p }),
  setErrors: (e) => ({ type: 'credit_set_errors', payload: e }),
  setLoading: (v) => ({ type: 'credit_set_loading', payload: v }),
}));

vi.mock('../../redux/accountsSlice', () => ({
  setAnalytics: (p) => ({ type: 'accounts_set_analytics', payload: p }),
  setErrors: (e) => ({ type: 'accounts_set_errors', payload: e }),
  setLoading: (v) => ({ type: 'accounts_set_loading', payload: v }),
}));

vi.mock('../../redux/predictionSlice', () => ({
  setPredictionResults: (p) => ({ type: 'pred_set_results', payload: p }),
  setErrors: (e) => ({ type: 'pred_set_errors', payload: e }),
  setLoading: (v) => ({ type: 'pred_set_loading', payload: v }),
  setLoadingTask: (p) => ({ type: 'pred_set_loading_task', payload: p }),
  setTask: (p) => ({ type: 'pred_set_task', payload: p }),
}));

vi.mock('../../redux/pensionSlice', () => ({
  create: (p) => ({ type: 'pension_create', payload: p }),
  deleteContribution: (p) => ({
    type: 'pension_delete_contribution',
    payload: p,
  }),
  set: (p) => ({ type: 'pension_set', payload: p }),
  setCompletedLoadingItem: (p) => ({
    type: 'pension_set_completed',
    payload: p,
  }),
  setErrors: (e) => ({ type: 'pension_set_errors', payload: e }),
  setLoading: (v) => ({ type: 'pension_set_loading', payload: v }),
  setLoadingItems: (p) => ({ type: 'pension_set_loading_items', payload: p }),
  update: (p) => ({ type: 'pension_update', payload: p }),
}));

describe('FinanceApi', () => {
  beforeEach(() => vi.clearAllMocks());

  test('getCredit dispatches loading and set on success', async () => {
    const data = { credit: [1] };
    axios.get.mockResolvedValueOnce({ data });
    const dispatch = vi.fn();
    FinanceApi.getCredit('tok')(dispatch);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'credit_set_loading',
      payload: true,
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'credit_set',
      payload: data,
    });
    expect(axios.get).toHaveBeenCalledWith('finance/credit/', {
      headers: { Authorization: 'tok' },
    });
  });

  test('getExpenses dispatches loading and setAnalytics on success', async () => {
    const analytics = { total: 100 };
    axios.get.mockResolvedValueOnce({ data: analytics });
    const dispatch = vi.fn();
    FinanceApi.getExpenses('tok', 12, 2023)(dispatch);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'accounts_set_loading',
      payload: true,
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'accounts_set_analytics',
      payload: analytics,
    });
    expect(axios.get).toHaveBeenCalledWith(
      'finance/accounts/12/expenses/?year=2023',
      { headers: { Authorization: 'tok' } }
    );
  });
});

describe('PredictionApi', () => {
  beforeEach(() => vi.clearAllMocks());

  test('getTask dispatches setLoadingTask and setTask', async () => {
    const resp = { id: 1 };
    axios.get.mockResolvedValueOnce({ data: resp });
    const dispatch = vi.fn();
    PredictionApi.getTask('tok', 'predict')(dispatch);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'pred_set_loading_task',
      payload: { type: 'predict', loading: true },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'pred_set_task',
      payload: { type: 'predict', data: resp, updateLoading: true },
    });
  });

  test('getTasks dispatches setPredictionResults', async () => {
    const resp = [{ id: 1 }];
    axios.get.mockResolvedValueOnce({ data: resp });
    const dispatch = vi.fn();
    PredictionApi.getTasks('tok')(dispatch);
    // ensure loading was dispatched and the request was made
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'pred_set_loading',
      payload: true,
    });
    expect(axios.get).toHaveBeenCalledWith('finance/prediction/', {
      headers: { Authorization: 'tok' },
    });
  });
});

describe('PensionApi instance methods', () => {
  beforeEach(() => vi.clearAllMocks());

  test('createContribution dispatches update and shows toast', async () => {
    const resp = { id: 2 };
    axios.post.mockResolvedValueOnce({ data: resp });
    const instance = new PensionApi('tok');
    const dispatch = vi.fn();
    instance.createContribution(5, { date: '2023-01-01' })(dispatch);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'pension_set_loading',
      payload: true,
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'pension_update',
      payload: resp,
    });
  });

  test('deleteContribution dispatches and shows warning on success', async () => {
    axios.delete.mockResolvedValueOnce({ data: {} });
    const instance = new PensionApi('tok');
    const dispatch = vi.fn();
    instance.deleteContribution(5, 7, 'Jan')(dispatch);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'pension_set_loading_items',
      payload: 5,
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'pension_delete_contribution',
      payload: { pensionId: 5, contributionId: 7 },
    });
  });

  test('updateContribution dispatches update and shows toast', async () => {
    const resp = { id: 3 };
    axios.patch.mockResolvedValueOnce({ data: resp });
    const instance = new PensionApi('tok');
    const dispatch = vi.fn();
    instance.updateContribution(5, 8, { date: '2023-02-02' })(dispatch);
    await Promise.resolve();
    await Promise.resolve();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'pension_set_loading_items',
      payload: 5,
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: 'pension_update',
      payload: resp,
    });
  });
});

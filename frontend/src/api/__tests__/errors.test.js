import { toast } from 'react-toastify';
import { handleErrors } from '../errors';

vi.mock('react-toastify', () => ({
  toast: { warning: vi.fn() },
}));
vi.mock('../auth', () => ({ toastParams: {} }));

describe('handleErrors', () => {
  const dispatch = vi.fn();
  const setErrors = vi.fn((errors) => ({
    type: 'errors/set',
    payload: errors,
  }));
  const setLoading = vi.fn((loading) => ({
    type: 'loading/set',
    payload: loading,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('dispatches unexpected-response messages for non-JSON responses', () => {
    handleErrors(
      { response: { headers: { 'content-type': 'text/html' }, status: 502 } },
      dispatch,
      setErrors
    );

    expect(setErrors).toHaveBeenCalledWith(['Unexpected response [502]']);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'errors/set',
      payload: ['Unexpected response [502]'],
    });
  });

  test('logs out after a JSON session-expired response', () => {
    handleErrors(
      {
        request: { responseURL: 'https://api.example.test/request' },
        response: {
          headers: { 'content-type': 'application/json' },
          data: { msg: 'User is not logged on.' },
        },
      },
      dispatch,
      setErrors,
      setLoading
    );

    expect(toast.warning).toHaveBeenCalled();
    expect(setLoading).toHaveBeenCalledWith(false);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  test('dispatches JSON error data', () => {
    const data = { detail: 'Invalid request' };
    handleErrors(
      {
        request: { responseURL: 'https://api.example.test/request' },
        response: {
          headers: { 'content-type': 'application/json' },
          data,
        },
      },
      dispatch,
      setErrors
    );

    expect(dispatch).toHaveBeenCalledWith({
      type: 'errors/set',
      payload: data,
    });
  });

  test('dispatches a generic message when there is no response', () => {
    handleErrors(new Error('Network unavailable'), dispatch, setErrors);

    expect(dispatch).toHaveBeenCalledWith({
      type: 'errors/set',
      payload: ['Something went wrong [Network unavailable]'],
    });
  });
});

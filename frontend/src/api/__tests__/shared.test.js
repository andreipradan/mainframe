// Combined, more comprehensive tests follow below.
import {
  createSearchParams,
  mix,
  TokenMixin,
  CreateApi,
  DeleteApi,
  ListApi,
  UpdateApi,
} from '../shared';

jest.mock('../index', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
  },
  ngrokAxios: {},
}));

jest.mock('../errors', () => ({ handleErrors: jest.fn() }));
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));
jest.mock('../auth', () => ({ toastParams: {} }));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('shared utils', () => {
  test('createSearchParams handles null, arrays and values', () => {
    expect(createSearchParams(null)).toBe('');
    const params = { a: 1, b: [2, 3], c: 'x' };
    const sp = createSearchParams(params);
    const str = sp.toString();
    expect(str).toContain('a=1');
    expect(str).toContain('b=2');
    expect(str).toContain('b=3');
    expect(str).toContain('c=x');
  });

  test('mix throws when TokenMixin missing', () => {
    expect(() => mix()).toThrow(/All Api classes must inherit from TokenMixin/);
  });

  test('TokenMixin enforces static attributes', () => {
    class Bad extends TokenMixin(Object) {}
    expect(() => new Bad('token')).toThrow(
      /class must implement the static 'baseUrl'/i
    );
    class AlsoBad extends TokenMixin(Object) {
      static baseUrl = 'foo';
    }
    expect(() => new AlsoBad('t')).toThrow(
      /class must implement the static 'methods' object/i
    );
  });
});

describe('CreateApi', () => {
  const axios = require('../index').default;
  const { toast } = require('react-toastify');

  test('create dispatches create action and shows toast on success', async () => {
    const responseData = { id: 1, name: 'MyItem' };
    axios.post.mockResolvedValueOnce({ data: responseData });

    // Prepare methods expected by CreateApi
    const methods = {
      set: () => ({ type: 'set' }),
      setLoading: (v) => ({ type: 'setLoading', payload: v }),
      setErrors: (e) => ({ type: 'setErrors', payload: e }),
      create: (p) => ({ type: 'create', payload: p }),
    };

    class Api extends mix(CreateApi, TokenMixin) {}
    Api.baseUrl = 'finance/items';
    Api.methods = methods;

    const instance = new Api('token-123');
    const dispatch = jest.fn();

    // call create
    instance.create({ foo: 'bar' })(dispatch);
    // wait for promise microtasks to complete
    await Promise.resolve();
    await Promise.resolve();

    // First call should set loading true
    expect(dispatch).toHaveBeenCalledWith(methods.setLoading(true));
    // Then create action dispatched with response data
    expect(dispatch).toHaveBeenCalledWith(methods.create(responseData));
    // Toast success called
    expect(toast.success).toHaveBeenCalled();
  });
});

describe('DeleteApi, ListApi and UpdateApi', () => {
  const axios = require('../index').default;
  const { toast } = require('react-toastify');

  test('DeleteApi.delete dispatches delete and shows toast on success', async () => {
    axios.delete.mockResolvedValueOnce({});

    const methods = {
      set: (p) => ({ type: 'set', payload: p }),
      setLoading: (v) => ({ type: 'setLoading', payload: v }),
      setErrors: (e) => ({ type: 'setErrors', payload: e }),
      delete: (id) => ({ type: 'delete', payload: id }),
      setCompletedLoadingItem: (id) => ({ type: 'completed', payload: id }),
      setLoadingItems: (id) => ({ type: 'loadingItems', payload: id }),
    };

    class Api extends mix(DeleteApi, TokenMixin) {}
    Api.baseUrl = 'things/items';
    Api.methods = methods;

    const instance = new Api('token-xyz');
    const dispatch = jest.fn();

    instance.delete('abc', 'MyThing')(dispatch);
    await Promise.resolve();
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalledWith(methods.setLoadingItems('abc'));
    expect(dispatch).toHaveBeenCalledWith(methods.delete('abc'));
    expect(toast.error).toHaveBeenCalled();
  });

  test('DeleteApi.delete handles failure by completing loading item', async () => {
    axios.delete.mockRejectedValueOnce(new Error('fail'));

    const methods = {
      set: (p) => ({ type: 'set', payload: p }),
      setLoading: (v) => ({ type: 'setLoading', payload: v }),
      setErrors: (e) => ({ type: 'setErrors', payload: e }),
      delete: (id) => ({ type: 'delete', payload: id }),
      setCompletedLoadingItem: (id) => ({ type: 'completed', payload: id }),
      setLoadingItems: (id) => ({ type: 'loadingItems', payload: id }),
    };

    class Api extends mix(DeleteApi, TokenMixin) {}
    Api.baseUrl = 'things/items';
    Api.methods = methods;

    const instance = new Api('token-xyz');
    const dispatch = jest.fn();

    instance.delete('bad')(dispatch);
    await Promise.resolve();
    await Promise.resolve();

    // on error it should call setCompletedLoadingItem via dispatch
    expect(dispatch).toHaveBeenCalledWith(
      methods.setCompletedLoadingItem('bad')
    );
  });

  test('ListApi.getList dispatches set with response', async () => {
    const data = { results: [1, 2] };
    axios.get.mockResolvedValueOnce({ data });

    const methods = {
      set: (p) => ({ type: 'set', payload: p }),
      setLoading: () => ({ type: 'ld' }),
      setErrors: () => ({ type: 'err' }),
    };
    class Api extends mix(ListApi, TokenMixin) {}
    Api.baseUrl = 'things/list';
    Api.methods = methods;

    const instance = new Api('t');
    const dispatch = jest.fn();

    instance.getList({ a: 1 })(dispatch);
    await Promise.resolve();
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalledWith(methods.setLoading());
    expect(dispatch).toHaveBeenCalledWith(methods.set(data));
  });

  test('UpdateApi.update dispatches update and shows toast', async () => {
    const responseData = { id: 5, name: 'Updated' };
    axios.patch.mockResolvedValueOnce({ data: responseData });

    const methods = {
      set: (p) => ({ type: 'set', payload: p }),
      setLoadingItems: (id) => ({ type: 'li', payload: id }),
      update: (p) => ({ type: 'update', payload: p }),
      setErrors: () => ({ type: 'err' }),
      setLoading: () => ({ type: 'sl' }),
    };
    class Api extends mix(UpdateApi, TokenMixin) {}
    Api.baseUrl = 'things/update';
    Api.methods = methods;

    const instance = new Api('t');
    const dispatch = jest.fn();

    instance.update(5, { name: 'x' })(dispatch);
    await Promise.resolve();
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalledWith(methods.setLoadingItems(5));
    expect(dispatch).toHaveBeenCalledWith(
      methods.update({ ...responseData, dontClearSelectedItem: true })
    );
    expect(toast.info).toHaveBeenCalled();
  });

  test('CreateApi.create handles failure via handleErrors', async () => {
    const errors = require('../errors');
    const axios = require('../index').default;
    axios.post.mockRejectedValueOnce(new Error('create-fail'));

    const methods = {
      set: () => ({ type: 'set' }),
      setLoading: (v) => ({ type: 'setLoading', payload: v }),
      setErrors: (e) => ({ type: 'setErrors', payload: e }),
      create: (p) => ({ type: 'create', payload: p }),
    };

    class Api extends mix(CreateApi, TokenMixin) {}
    Api.baseUrl = 'things/create';
    Api.methods = methods;

    const instance = new Api('t');
    const dispatch = jest.fn();

    instance.create({})(dispatch);
    await Promise.resolve();
    await Promise.resolve();

    expect(errors.handleErrors).toHaveBeenCalled();
  });

  test('CreateApi uses displayField and displayFields for toast', async () => {
    const axios = require('../index').default;
    const { toast } = require('react-toastify');

    // displayField case
    const dataA = { id: 7, label: 'LabelA' };
    axios.post.mockResolvedValueOnce({ data: dataA });
    const methodsA = {
      set: () => ({}),
      setLoading: () => ({}),
      setErrors: () => ({}),
      create: () => ({}),
    };
    class ApiA extends mix(CreateApi, TokenMixin) {}
    ApiA.baseUrl = 'items/list';
    ApiA.methods = methodsA;
    ApiA.displayField = 'label';
    const instanceA = new ApiA('t');
    instanceA.create({})(jest.fn());
    await Promise.resolve();
    await Promise.resolve();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('LabelA'),
      expect.any(Object)
    );

    // displayFields case
    const dataB = { id: 8, second: 'SecondVal' };
    axios.post.mockResolvedValueOnce({ data: dataB });
    const methodsB = {
      set: () => ({}),
      setLoading: () => ({}),
      setErrors: () => ({}),
      create: () => ({}),
    };
    class ApiB extends mix(CreateApi, TokenMixin) {}
    ApiB.baseUrl = 'items/list';
    ApiB.methods = methodsB;
    ApiB.displayFields = ['first', 'second'];
    const instanceB = new ApiB('t');
    instanceB.create({})(jest.fn());
    await Promise.resolve();
    await Promise.resolve();
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('SecondVal'),
      expect.any(Object)
    );
  });

  test('ListApi uses ngrokAxios when configured', async () => {
    const pkg = require('../index');
    // ensure ngrokAxios has a get mock
    pkg.ngrokAxios.get = jest
      .fn()
      .mockResolvedValueOnce({ data: { results: [9] } });
    const methods = {
      set: (p) => ({ type: 'set', payload: p }),
      setLoading: () => ({ type: 'ld' }),
      setErrors: () => ({ type: 'err' }),
    };
    const { ListApi } = require('../shared');
    class Api extends mix(ListApi, TokenMixin) {}
    Api.baseUrl = 'things/list';
    Api.methods = methods;
    Api.ngrokAxios = ['getList'];

    const instance = new Api('t');
    const dispatch = jest.fn();
    instance.getList({})(dispatch);
    await Promise.resolve();
    await Promise.resolve();

    expect(pkg.ngrokAxios.get).toHaveBeenCalled();
  });

  test('UpdateApi.update handles failure via handleErrors', async () => {
    const errors = require('../errors');
    const axios = require('../index').default;
    axios.patch.mockRejectedValueOnce(new Error('update-fail'));

    const methods = {
      set: (p) => ({ type: 'set', payload: p }),
      setLoadingItems: (id) => ({ type: 'li', payload: id }),
      update: (p) => ({ type: 'update', payload: p }),
      setErrors: () => ({ type: 'err' }),
      setLoading: () => ({ type: 'sl' }),
    };
    class Api extends mix(UpdateApi, TokenMixin) {}
    Api.baseUrl = 'things/update';
    Api.methods = methods;

    const instance = new Api('t');
    const dispatch = jest.fn();

    instance.update(5, { name: 'x' })(dispatch);
    await Promise.resolve();
    await Promise.resolve();

    expect(errors.handleErrors).toHaveBeenCalled();
  });

  test('UploadApi.upload dispatches and shows toast', async () => {
    const axios = require('../index').default;
    axios.post.mockResolvedValueOnce({ data: { id: 11 } });
    const { UploadApi } = require('../shared');
    const methods = {
      set: (p) => ({ type: 'set', payload: p }),
      setLoading: () => ({ type: 'ld' }),
      setErrors: () => ({ type: 'err' }),
    };
    class Api extends mix(UploadApi, TokenMixin) {}
    Api.baseUrl = 'files/uploads';
    Api.methods = methods;

    const instance = new Api('t');
    const dispatch = jest.fn();

    instance.upload(new FormData())(dispatch);
    await Promise.resolve();
    await Promise.resolve();

    const { toast } = require('react-toastify');
    expect(dispatch).toHaveBeenCalledWith(methods.set({ id: 11 }));
    expect(toast.success).toHaveBeenCalled();
  });

  test('RunApi.run uses ngrokAxios and shows toast on success', async () => {
    const pkg = require('../index');
    pkg.ngrokAxios.put = jest.fn().mockResolvedValueOnce({});
    const { RunApi } = require('../shared');
    const methods = {
      set: () => ({}),
      setLoading: () => ({}),
      setErrors: () => ({}),
    };
    class Api extends mix(RunApi, TokenMixin) {}
    Api.baseUrl = 'jobs/run';
    Api.methods = methods;
    Api.ngrokAxios = ['run'];

    const instance = new Api('t');
    instance.run('abc', {})(jest.fn());
    await Promise.resolve();
    await Promise.resolve();

    const { toast } = require('react-toastify');
    expect(pkg.ngrokAxios.put).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });
});

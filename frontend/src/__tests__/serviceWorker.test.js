const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('service worker lifecycle', () => {
  let originalNodeEnv;
  let originalPublicUrl;
  let originalFetch;
  let registration;
  let serviceWorker;
  let loadHandlers;

  beforeEach(() => {
    jest.resetModules();
    originalNodeEnv = process.env.NODE_ENV;
    originalPublicUrl = process.env.PUBLIC_URL;
    originalFetch = global.fetch;
    loadHandlers = [];
    process.env.NODE_ENV = 'production';
    process.env.PUBLIC_URL = '/';

    registration = {
      installing: { state: 'installed', onstatechange: null },
      unregister: jest.fn().mockResolvedValue(true),
    };
    serviceWorker = {
      controller: null,
      register: jest.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorker,
    });
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      headers: { get: () => 'application/javascript' },
    });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest
      .spyOn(window, 'addEventListener')
      .mockImplementation((event, handler) => {
        if (event === 'load') loadHandlers.push(handler);
      });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalPublicUrl === undefined) {
      delete process.env.PUBLIC_URL;
    } else {
      process.env.PUBLIC_URL = originalPublicUrl;
    }
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('validates and registers the localhost worker and reports first install', async () => {
    const { register } = require('../serviceWorker');
    const onSuccess = jest.fn();

    register({ onSuccess });
    loadHandlers.at(-1)();
    await flushPromises();
    await flushPromises();

    expect(global.fetch).toHaveBeenCalledWith('//service-worker.js');
    expect(serviceWorker.register).toHaveBeenCalled();
    registration.onupdatefound();
    expect(registration.installing.onstatechange).toBeInstanceOf(Function);
    registration.installing.onstatechange();
    expect(onSuccess).toHaveBeenCalledWith(registration);
  });

  test('reports updates and handles a missing installing worker', async () => {
    const { register } = require('../serviceWorker');
    const onUpdate = jest.fn();

    serviceWorker.controller = {};
    registration.installing = null;
    register({ onUpdate });
    loadHandlers.at(-1)();
    await flushPromises();
    await flushPromises();
    expect(registration.installing).toBeNull();
    registration.onupdatefound();

    registration.installing = { state: 'installed', onstatechange: null };
    register({ onUpdate });
    loadHandlers.at(-1)();
    await flushPromises();
    await flushPromises();
    registration.onupdatefound();
    registration.installing.onstatechange();
    expect(onUpdate).toHaveBeenCalledWith(registration);
  });

  test('unregisters an invalid worker and handles offline fetch errors', async () => {
    const { register, unregister } = require('../serviceWorker');
    global.fetch.mockResolvedValueOnce({
      status: 404,
      headers: { get: () => 'application/javascript' },
    });

    register({});
    loadHandlers.at(-1)();
    await flushPromises();
    await flushPromises();
    expect(registration.unregister).toHaveBeenCalled();

    global.fetch.mockRejectedValueOnce(new Error('offline'));
    register({});
    loadHandlers.at(-1)();
    await flushPromises();
    expect(console.log).toHaveBeenCalledWith(
      'No internet connection found. App is running in offline mode.'
    );

    unregister();
    await flushPromises();
    expect(registration.unregister).toHaveBeenCalledTimes(2);
  });
});

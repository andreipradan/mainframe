import { axios, ngrokAxios } from '../index';

vi.mock('axios', () => ({
  default: {
    create: vi.fn((config) => {
      const client = {
        config,
        requestHandlers: [],
        responseHandlers: [],
        interceptors: {
          request: {
            use: (onFulfilled, onRejected) => {
              client.requestHandlers = [onFulfilled, onRejected];
            },
          },
          response: {
            use: (onFulfilled, onRejected) => {
              client.responseHandlers = [onFulfilled, onRejected];
            },
          },
        },
      };
      return client;
    }),
  },
}));

describe('configured axios clients', () => {
  test('uses the Vite environment and installs pass-through interceptors', async () => {
    expect(axios.config.baseURL).toEqual(expect.any(String));
    expect(ngrokAxios.config.baseURL).toBe(import.meta.env.VITE_NGROK_URL);
    expect(ngrokAxios.config.headers).toMatchObject({
      'ngrok-skip-browser-warning': true,
    });

    for (const client of [axios, ngrokAxios]) {
      const value = {};
      const error = new Error('request failed');

      await expect(client.requestHandlers[0](value)).resolves.toBe(value);
      await expect(client.requestHandlers[1](error)).rejects.toBe(error);
      await expect(client.responseHandlers[0](value)).resolves.toBe(value);
      await expect(client.responseHandlers[1](error)).rejects.toBe(error);
    }
  });
});

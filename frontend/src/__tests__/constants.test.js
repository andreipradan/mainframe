describe('API server configuration', () => {
  test('uses the local backend port on localhost', async () => {
    vi.resetModules();
    vi.doMock('../serviceWorker', () => ({ isLocalhost: true }));

    const { API_SERVER } = await import('../constants');

    expect(API_SERVER).toBe('http://127.0.0.1:8000/');
  });

  test('uses the Vite API URL outside localhost', async () => {
    vi.resetModules();
    vi.doMock('../serviceWorker', () => ({ isLocalhost: false }));

    const { API_SERVER } = await import('../constants');

    expect(API_SERVER).toBe(`${import.meta.env.VITE_API_URL}/`);
  });
});

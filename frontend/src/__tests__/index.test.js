const mocks = vi.hoisted(() => ({
  createRoot: vi.fn(),
  render: vi.fn(),
  unregister: vi.fn(),
}));

vi.mock('react-dom/client', () => ({ createRoot: mocks.createRoot }));
vi.mock('../app/App', () => ({ default: () => null }));
vi.mock('../i18n', () => ({}));
vi.mock('../redux/store', () => ({ default: {} }));
vi.mock('../serviceWorker', () => ({ unregister: mocks.unregister }));

describe('application entry point', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
    mocks.createRoot.mockReturnValue({ render: mocks.render });
  });

  test('mounts the app using the React 18 root API', async () => {
    await import('../index');

    expect(mocks.createRoot).toHaveBeenCalledWith(
      document.getElementById('root')
    );
    expect(mocks.render).toHaveBeenCalledOnce();
    expect(mocks.unregister).toHaveBeenCalledOnce();
  });
});

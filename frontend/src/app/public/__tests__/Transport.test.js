import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Transport from '../Transport';
// Import `Transport` after setting up mocks so mocked modules are applied
// before the module is loaded.

// Mock heavy mapping libraries
vi.mock('leaflet.fullscreen', () => ({}));
vi.mock('react-leaflet', () => ({
  MapContainer: (props) => <div data-testid="map">{props.children}</div>,
  Marker: (props) => <div data-testid="marker">{props.children}</div>,
  TileLayer: () => <div data-testid="tilelayer" />, 
  useMap: () => ({ addControl: vi.fn(), removeControl: vi.fn() }),
  Popup: (props) => <div>{props.children}</div>,
  Polyline: () => <div />,
  Tooltip: (props) => <div>{props.children}</div>,
}));
vi.mock('react-leaflet-cluster', () => ({ __esModule: true, default: (p) => <div>{p.children}</div> }));
vi.mock('leaflet', () => {
  const leaflet = {
    divIcon: () => ({}),
    control: { fullscreen: () => ({ addTo: vi.fn(), remove: vi.fn() }) },
  };
  return { ...leaflet, default: leaflet };
});
vi.mock('src/api/transport', () => ({
  TransitApi: class {
    getList = () => vi.fn()
    getVehicles = () => vi.fn();
  },
}));

describe('Transport component', () => {
  it('renders without crashing', async () => {
    const initialState = { auth: { token: null }, transit: { vehicles: [], stops: [], pollingEnabled: false, loading: false } };
    const store = configureStore({ reducer: (s = initialState) => s });

    const div = document.createElement('div');
    const root = createRoot(div);
    await act(async () => {
      root.render(
        <Provider store={store}>
          <Transport />
        </Provider>
      );
      await new Promise(r => setTimeout(r, 0));
    });

    expect(div.innerHTML).toContain('Public Transport');

    await act(async () => {
      root.unmount();
      await new Promise(r => setTimeout(r, 0));
    });
  });
});

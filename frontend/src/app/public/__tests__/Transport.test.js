import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
// Import `Transport` after setting up mocks so mocked modules are applied
// before the module is loaded.

// Mock heavy mapping libraries
jest.mock('leaflet.fullscreen', () => ({}));
jest.mock('react-leaflet', () => ({
  MapContainer: (props) => <div data-testid="map">{props.children}</div>,
  Marker: (props) => <div data-testid="marker">{props.children}</div>,
  TileLayer: (props) => <div data-testid="tilelayer" />, 
  useMap: () => ({ addControl: () => {}, removeControl: () => {} }),
  Popup: (props) => <div>{props.children}</div>,
  Polyline: () => <div />,
  Tooltip: (props) => <div>{props.children}</div>,
}));
jest.mock('react-leaflet-cluster', () => ({ __esModule: true, default: (p) => <div>{p.children}</div> }));
jest.mock('leaflet', () => ({
  divIcon: () => ({}),
  control: { fullscreen: () => ({ addTo: () => {}, remove: () => {} }) },
}));
jest.mock('src/api/transport', () => ({
  TransitApi: function() {
    return {
      getList: (kwargs) => (dispatch) => {},
      getVehicles: (kwargs) => (dispatch) => {},
    };
  },
}));

describe('Transport component', () => {
  it('renders without crashing', async () => {
    const Transport = require('../Transport').default;
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

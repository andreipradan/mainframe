import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock mapping libs before requiring the component
jest.mock('leaflet.fullscreen', () => ({}));
jest.mock('react-leaflet-cluster', () => ({ __esModule: true, default: (p) => <div>{p.children}</div> }));
jest.mock('leaflet', () => ({
  divIcon: function (opts) { return { _opts: opts }; },
  control: { fullscreen: () => ({ addTo: jest.fn(), remove: jest.fn() }) },
}));

// Marker will trigger popupopen immediately to set selectedVehicle inside the component
jest.mock('react-leaflet', () => ({
  MapContainer: (props) => <div data-testid="map">{props.children}</div>,
  Marker: (props) => {
    // simulate popupopen after render (microtask) to avoid setState-in-render
    if (props.eventHandlers && typeof props.eventHandlers.popupopen === 'function') {
      Promise.resolve().then(() => {
        props.eventHandlers.popupopen();
      });
    }
    return <div data-testid="marker">{props.children}</div>;
  },
  TileLayer: () => <div data-testid="tilelayer" />,
  useMap: () => ({ addControl: jest.fn(), removeControl: jest.fn() }),
  Popup: (props) => <div>{props.children}</div>,
  Polyline: () => <div data-testid="polyline" />, 
  Tooltip: (props) => <div>{props.children}</div>,
  
}));

jest.mock('src/api/transport', () => ({
  TransitApi: class {
    getList = () => jest.fn();
    getVehicles = () => jest.fn();
  },
}));

describe('Transport behavior', () => {

  test('renders vehicle markers when vehicles present', async () => {
    const initialState = {
      auth: { token: null },
      transit: {
        vehicles: [
          { id: 'v1', latitude: 46.7, longitude: 23.59, trip_id: 't_0' },
          { id: 'v2', latitude: 46.71, longitude: 23.6, trip_id: 't_1' },
        ],
        pollingEnabled: false,
        loading: false,
      },
    };

    const store = configureStore({ reducer: (s = initialState) => s });
    const div = document.createElement('div');
    const root = createRoot(div);
    act(() => {
      root.render(
        <Provider store={store}>
          {(() => { const Transport = require('../Transport').default; return <Transport />; })()}
        </Provider>
      );
    });

    // flush microtasks (popupopen) inside act
    await act(async () => { await Promise.resolve(); });

    const markers = div.querySelectorAll('[data-testid="marker"]');
    expect(markers.length).toBeGreaterThanOrEqual(1);
    act(() => { root.unmount(); });
  });

  test('switching to stops mode renders stop markers', async () => {
    const initialState = {
      auth: { token: null },
      transit: {
        vehicles: [],
        stops: [
          { stop_id: 's1', stop_lat: 46.7, stop_lon: 23.59, stop_name: 'A', stop_desc: 'd' },
          { stop_id: 's2', stop_lat: 46.71, stop_lon: 23.6, stop_name: 'B', stop_desc: 'd' },
        ],
        stop_times: [],
        pollingEnabled: false,
        loading: false,
      },
    };

    const store = configureStore({ reducer: (s = initialState) => s });
    const div = document.createElement('div');
    const root = createRoot(div);
    act(() => {
      root.render(
        <Provider store={store}>
          {(() => { const Transport = require('../Transport').default; return <Transport />; })()}
        </Provider>
      );
    });

    // find the select and change to 'stops'
    const select = div.querySelector('select');
    expect(select).toBeTruthy();
    act(() => {
      select.value = 'stops';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // flush any microtasks triggered by change handlers
    await act(async () => { await Promise.resolve(); });

    const markers = div.querySelectorAll('[data-testid="marker"]');
    expect(markers.length).toBeGreaterThanOrEqual(1);
    act(() => { root.unmount(); });
  });

  test('renders polyline when selected vehicle and shapes exist', async () => {
    const initialState = {
      auth: { token: null },
      transit: {
        vehicles: [ { id: 'v1', latitude: 46.7, longitude: 23.59, trip_id: 'shape_1' } ],
        shapes: [
          { shape_id: 'shape_1', shape_pt_lat: 46.7, shape_pt_lon: 23.59 },
          { shape_id: 'shape_1', shape_pt_lat: 46.71, shape_pt_lon: 23.6 },
        ],
        pollingEnabled: false,
        loading: false,
      },
    };

    const store = configureStore({ reducer: (s = initialState) => s });
    const div = document.createElement('div');
    const root = createRoot(div);
    act(() => {
      root.render(
        <Provider store={store}>
          {(() => { const Transport = require('../Transport').default; return <Transport />; })()}
        </Provider>
      );
    });

    // allow popupopen -> selectedVehicle microtask to run
    await act(async () => { await Promise.resolve(); });

    const polylines = div.querySelectorAll('[data-testid="polyline"]');
    expect(polylines.length).toBeGreaterThanOrEqual(1);
    act(() => { root.unmount(); });
  });
});

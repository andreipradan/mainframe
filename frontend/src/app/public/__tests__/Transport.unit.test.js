import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Mock heavy mapping libraries before importing Transport
jest.mock('leaflet.fullscreen', () => ({}));
jest.mock('react-leaflet', () => ({
  MapContainer: (props) => <div data-testid="map">{props.children}</div>,
  Marker: (props) => (
    <div
      data-testid="marker"
      ref={(el) => {
        if (el && props.eventHandlers) el._eventHandlers = props.eventHandlers;
      }}
    >
      {props.children}
    </div>
  ),
  TileLayer: () => <div data-testid="tilelayer" />,
  useMap: () => ({ addControl: jest.fn(), removeControl: jest.fn() }),
  Popup: (props) => <div>{props.children}</div>,
  Polyline: () => <div data-testid="polyline" />,
  Tooltip: (props) => <div>{props.children}</div>,
}));
jest.mock('react-leaflet-cluster', () => ({ __esModule: true, default: (p) => <div>{p.children}</div> }));
jest.mock('leaflet', () => ({
  divIcon: function () { return jest.fn(); },
  control: { fullscreen: () => ({ addTo: jest.fn(), remove: jest.fn() }) },
}));
jest.mock('src/api/transport', () => ({
  TransitApi: function () {
    return {
      getList: () => jest.fn(),
      getVehicles: () => jest.fn(),
    };
  },
}));

describe('Transport unit behaviors', () => {
  it('renders vehicle markers from state', async () => {
    const Transport = require('../Transport').default;

    const vehicles = [
      { id: 'v1', latitude: 46.77, longitude: 23.58, bike_accessible: 'BIKE_ACCESSIBLE', wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE', route_id: 'r1', trip_id: 't1', timestamp: new Date().toISOString(), speed: 10 },
      { id: 'v2', latitude: 46.78, longitude: 23.59, bike_accessible: 'NO', wheelchair_accessible: 'NO', route_id: 'r1', trip_id: 't2', timestamp: new Date().toISOString(), speed: 5 },
    ];

    const initialState = {
      auth: { token: null },
      transit: {
        vehicles,
        stops: [],
        pollingEnabled: false,
        loading: false,
        routes: [],
        trips: [],
        shapes: [],
      },
    };

    const store = configureStore({ reducer: (s = initialState) => s });

    const div = document.createElement('div');
    const root = createRoot(div);

    await act(async () => {
      root.render(
        <Provider store={store}>
          <Transport />
        </Provider>
      );
      await Promise.resolve();
    });

    const markers = div.querySelectorAll('[data-testid="marker"]');
    expect(markers.length).toBeGreaterThanOrEqual(vehicles.length);

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
  });

  it('bike toggle filters vehicle markers', async () => {
    const Transport = require('../Transport').default;

    const vehicles = [
      { id: 'v1', latitude: 46.77, longitude: 23.58, bike_accessible: 'BIKE_ACCESSIBLE', wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE', route_id: 'r1', trip_id: 't1', timestamp: new Date().toISOString(), speed: 10 },
      { id: 'v2', latitude: 46.78, longitude: 23.59, bike_accessible: 'NO', wheelchair_accessible: 'NO', route_id: 'r1', trip_id: 't2', timestamp: new Date().toISOString(), speed: 5 },
    ];

    const initialState = {
      auth: { token: null },
      transit: { vehicles, stops: [], pollingEnabled: false, loading: false, routes: [], trips: [], shapes: [] },
    };

    const store = configureStore({ reducer: (s = initialState) => s });

    const div = document.createElement('div');
    const root = createRoot(div);

    await act(async () => {
      root.render(
        <Provider store={store}>
          <Transport />
        </Provider>
      );
      await Promise.resolve();
    });

    const before = div.querySelectorAll('[data-testid="marker"]').length;

    // find bike button (icon has class mdi-bike)
    const bikeIcon = div.querySelector('i.mdi-bike');
    expect(bikeIcon).toBeTruthy();
    const btn = bikeIcon.closest('button');
    expect(btn).toBeTruthy();

    await act(async () => {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const after = div.querySelectorAll('[data-testid="marker"]').length;
    const expectedBikeMarkers = vehicles.filter(
      (v) => v.bike_accessible === 'BIKE_ACCESSIBLE'
    ).length;
    expect(after).toBe(expectedBikeMarkers);
    expect(after).toBeLessThan(before);

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
  });

  it('renders stops markers when switching to stops mode', async () => {
    const Transport = require('../Transport').default;

    const stops = [
      { stop_id: 's1', stop_lat: 46.77, stop_lon: 23.58, stop_name: 'A' },
      { stop_id: 's2', stop_lat: 46.78, stop_lon: 23.59, stop_name: 'B' },
    ];

    const initialState = {
      auth: { token: null },
      transit: { vehicles: [], stops, pollingEnabled: false, loading: false, routes: [], trips: [], shapes: [] },
    };

    const store = configureStore({ reducer: (s = initialState) => s });

    const div = document.createElement('div');
    const root = createRoot(div);

    await act(async () => {
      root.render(
        <Provider store={store}>
          <Transport />
        </Provider>
      );
      await Promise.resolve();
    });

    const select = div.querySelector('select');
    expect(select).toBeTruthy();

    await act(async () => {
      select.value = 'stops';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });

    const markers = div.querySelectorAll('[data-testid="marker"]');
    expect(markers.length).toBeGreaterThanOrEqual(stops.length);

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
  });

  it('shows polylines when vehicle popup opened and shapes exist', async () => {
    const Transport = require('../Transport').default;

    const vehicles = [
      { id: 'v1', latitude: 46.77, longitude: 23.58, bike_accessible: 'BIKE_ACCESSIBLE', wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE', route_id: 'r1', trip_id: 'shape1', timestamp: new Date().toISOString(), speed: 10 },
    ];

    const shapes = [
      { shape_id: 'shape1', shape_pt_lat: 46.77, shape_pt_lon: 23.58 },
      { shape_id: 'shape1', shape_pt_lat: 46.775, shape_pt_lon: 23.585 },
      { shape_id: 'shape1', shape_pt_lat: 46.78, shape_pt_lon: 23.59 },
    ];

    const initialState = {
      auth: { token: null },
      transit: { vehicles, stops: [], pollingEnabled: false, loading: false, routes: [{ route_id: 'r1', route_short_name: '1' }], trips: [], shapes },
    };

    const store = configureStore({ reducer: (s = initialState) => s });

    const div = document.createElement('div');
    const root = createRoot(div);

    await act(async () => {
      root.render(
        <Provider store={store}>
          <Transport />
        </Provider>
      );
      await Promise.resolve();
    });

    const marker = div.querySelector('[data-testid="marker"]');
    expect(marker).toBeTruthy();

    // trigger popupopen handler attached by our Marker mock
    await act(async () => {
      await Promise.resolve();
      Promise.resolve().then(() => {
        marker._eventHandlers?.popupopen?.();
      });
      await Promise.resolve();
    });

    const polylines = div.querySelectorAll('[data-testid="polyline"]');
    expect(polylines.length).toBeGreaterThanOrEqual(2);

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
  });
});

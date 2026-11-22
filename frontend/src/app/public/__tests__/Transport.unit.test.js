import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import Transport from '../Transport';

// Mock heavy mapping libraries before importing Transport
vi.mock('leaflet.fullscreen', () => ({}));
vi.mock('react-leaflet', () => ({
  MapContainer: (props) => <div data-testid='map'>{props.children}</div>,
  Marker: (props) => (
    <div
      data-testid='marker'
      ref={(el) => {
        if (el && props.eventHandlers) el._eventHandlers = props.eventHandlers;
      }}
    >
      {props.children}
    </div>
  ),
  TileLayer: () => <div data-testid='tilelayer' />,
  useMap: () => ({ addControl: vi.fn(), removeControl: vi.fn() }),
  Popup: (props) => <div>{props.children}</div>,
  Polyline: () => <div data-testid='polyline' />,
  Tooltip: (props) => <div>{props.children}</div>,
}));
vi.mock('react-leaflet-cluster', () => ({
  __esModule: true,
  default: (p) => <div>{p.children}</div>,
}));
vi.mock('leaflet', () => {
  function divIcon() {
    return vi.fn();
  }

  const leaflet = {
    divIcon,
    control: { fullscreen: () => ({ addTo: vi.fn(), remove: vi.fn() }) },
  };
  return { ...leaflet, default: leaflet };
});
vi.mock('react-toastify', () => ({
  toast: { warning: vi.fn() },
}));
vi.mock('src/api/transport', () => ({
  TransitApi: class {
    getList = (...args) => ({ type: 'transport/getList', payload: args });
    getVehicles = (...args) => ({
      type: 'transport/getVehicles',
      payload: args,
    });
  },
}));

describe('Transport unit behaviors', () => {
  it('renders vehicle markers from state', async () => {
    const vehicles = [
      {
        id: 'v1',
        latitude: 46.77,
        longitude: 23.58,
        bike_accessible: 'BIKE_ACCESSIBLE',
        wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE',
        route_id: 'r1',
        trip_id: 't1',
        timestamp: new Date().toISOString(),
        speed: 10,
      },
      {
        id: 'v2',
        latitude: 46.78,
        longitude: 23.59,
        bike_accessible: 'NO',
        wheelchair_accessible: 'NO',
        route_id: 'r1',
        trip_id: 't2',
        timestamp: new Date().toISOString(),
        speed: 5,
      },
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
    const vehicles = [
      {
        id: 'v1',
        latitude: 46.77,
        longitude: 23.58,
        bike_accessible: 'BIKE_ACCESSIBLE',
        wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE',
        route_id: 'r1',
        trip_id: 't1',
        timestamp: new Date().toISOString(),
        speed: 10,
      },
      {
        id: 'v2',
        latitude: 46.78,
        longitude: 23.59,
        bike_accessible: 'NO',
        wheelchair_accessible: 'NO',
        route_id: 'r1',
        trip_id: 't2',
        timestamp: new Date().toISOString(),
        speed: 5,
      },
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
    const stops = [
      { stop_id: 's1', stop_lat: 46.77, stop_lon: 23.58, stop_name: 'A' },
      { stop_id: 's2', stop_lat: 46.78, stop_lon: 23.59, stop_name: 'B' },
    ];

    const initialState = {
      auth: { token: null },
      transit: {
        vehicles: [],
        stops,
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
    const vehicles = [
      {
        id: 'v1',
        latitude: 46.77,
        longitude: 23.58,
        bike_accessible: 'BIKE_ACCESSIBLE',
        wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE',
        route_id: 'r1',
        trip_id: 'shape1',
        timestamp: new Date().toISOString(),
        speed: 10,
      },
    ];

    const shapes = [
      { shape_id: 'shape1', shape_pt_lat: 46.77, shape_pt_lon: 23.58 },
      { shape_id: 'shape1', shape_pt_lat: 46.775, shape_pt_lon: 23.585 },
      { shape_id: 'shape1', shape_pt_lat: 46.78, shape_pt_lon: 23.59 },
    ];

    const initialState = {
      auth: { token: null },
      transit: {
        vehicles,
        stops: [],
        pollingEnabled: false,
        loading: false,
        routes: [{ route_id: 'r1', route_short_name: '1' }],
        trips: [],
        shapes,
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

  it('applies map filters, displays vehicle and stop fields, and fetches selected data', async () => {
    const now = new Date().toISOString();
    const vehicles = [
      {
        id: 'v1',
        latitude: 46.77,
        longitude: 23.58,
        bike_accessible: 'BIKE_ACCESSIBLE',
        wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE',
        route_id: 'r1',
        trip_id: 't1',
        timestamp: now,
        speed: 10,
      },
      {
        id: 'v2',
        latitude: 46.78,
        longitude: 23.59,
        bike_accessible: 'NO',
        wheelchair_accessible: 'NO',
        route_id: 'r2',
        trip_id: 't2',
        timestamp: now,
        speed: 5,
      },
    ];
    const initialState = {
      auth: { token: 'token' },
      transit: {
        vehicles,
        stops: [
          {
            stop_id: 's1',
            stop_lat: 46.77,
            stop_lon: 23.58,
            stop_name: 'Central',
            stop_desc: 'Main stop',
          },
        ],
        stop_times: [
          {
            trip_id: 't1',
            stop_id: 's1',
            stop_sequence: 1,
            arrival_time: '10:00',
          },
        ],
        routes: [
          {
            route_id: 'r1',
            route_short_name: 'M1',
            route_long_name: 'Metro line',
          },
          {
            route_id: 'r2',
            route_short_name: '5',
            route_long_name: 'Bus line',
          },
        ],
        trips: [
          { trip_id: 't1', route_id: 'r1', trip_headsign: 'City center' },
        ],
        shapes: [
          { shape_id: 't1', shape_pt_lat: 46.77, shape_pt_lon: 23.58 },
          { shape_id: 't1', shape_pt_lat: 46.78, shape_pt_lon: 23.59 },
        ],
        pollingEnabled: false,
        loading: false,
        vehicles_last_check: now,
        vehicles_last_update: now,
        vehicles_etag: 'etag',
        routes_etag: 'routes-etag',
        routes_last_check: now,
        routes_last_update: now,
      },
    };
    const store = configureStore({ reducer: (state = initialState) => state });
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

    expect(div.querySelectorAll('[data-testid="marker"]')).toHaveLength(2);
    expect(div.textContent).toContain('Checked');
    act(() => div.querySelector('.mdi-map').closest('button').click());
    act(() => div.querySelector('.mdi-bike').closest('button').click());
    expect(div.querySelectorAll('[data-testid="marker"]')).toHaveLength(1);
    act(() => div.querySelector('.mdi-wheelchair').closest('button').click());
    act(() => div.querySelector('button b').closest('button').click());
    const search = div.querySelector('input[placeholder="Search..."]');
    act(() => {
      search.value = 'M1';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => div.querySelector('.mdi-cog').closest('button').click());
    expect(div.textContent).toContain('Last routes update');

    const fetchEntity = Array.from(div.querySelectorAll('select')).find(
      (select) =>
        Array.from(select.options).some((option) => option.value === 'vehicles')
    );
    expect(fetchEntity).toBeTruthy();
    act(() => {
      fetchEntity.value = 'vehicles';
      fetchEntity.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const fetchButton = Array.from(div.querySelectorAll('button')).find(
      (button) => button.textContent.includes('Fetch')
    );
    act(() => fetchButton.click());
    expect(store.getState()).toBe(initialState);

    const firstMarker = div.querySelector('[data-testid="marker"]');
    await act(async () => {
      firstMarker._eventHandlers?.popupopen?.();
      await Promise.resolve();
    });
    expect(div.querySelector('.mdi-label')).toBeTruthy();
    const busField = div.querySelector('#checkbox-toggle-route_id');
    act(() => busField.click());
    expect(div.textContent).toContain('route_id');

    const mode = div.querySelectorAll('select')[0];
    act(() => {
      mode.value = 'stops';
      mode.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const stopField = div.querySelector('#checkbox-fields-stop-stop_id');
    expect(stopField).toBeTruthy();
    act(() => stopField.click());
    expect(
      div.querySelectorAll('[data-testid="marker"]').length
    ).toBeGreaterThan(0);
    expect(div.textContent).toContain('stop_id');

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
  });

  it('stops polling after the configured polling duration', async () => {
    vi.useFakeTimers();
    const initialState = {
      auth: { token: 'token' },
      transit: {
        vehicles: [],
        stops: [],
        pollingEnabled: true,
        loading: false,
      },
    };
    const store = configureStore({ reducer: (state = initialState) => state });
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

    await act(async () => {
      vi.advanceTimersByTime(245_000);
      await Promise.resolve();
    });
    expect(toast.warning).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ autoClose: false })
    );

    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    vi.useRealTimers();
  });
});

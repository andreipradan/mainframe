import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

describe('public utils', () => {
  beforeEach(() => vi.resetModules());

  test('FullscreenControl adds and removes the map control', async () => {
    const mockMap = { removeControl: vi.fn() };
    const mockControl = { addTo: vi.fn() };
    vi.doMock('leaflet', () => {
      const leaflet = {
        control: { fullscreen: vi.fn(() => mockControl) },
        divIcon: vi.fn(),
      };
      return { ...leaflet, default: leaflet };
    });
    vi.doMock('react-leaflet', () => ({
      TileLayer: () => null,
      useMap: () => mockMap,
    }));

    const { FullscreenControl } = await import('../utils');
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => root.render(React.createElement(FullscreenControl)));
    expect(mockControl.addTo).toHaveBeenCalledWith(mockMap);
    act(() => root.unmount());
    expect(mockMap.removeControl).toHaveBeenCalledWith(mockControl);
  });

  test('getDirectedRoute handles missing values and direction', async () => {
    vi.doMock('react-leaflet', () => ({ TileLayer: () => null, useMap: () => null }));
    vi.doMock('leaflet', () => {
      const leaflet = { divIcon: () => ({}) };
      return { ...leaflet, default: leaflet };
    });
    const { getDirectedRoute } = await import('../utils');

    expect(getDirectedRoute(null, 'Route Name')).toBe('Route Name');
    expect(getDirectedRoute('trip_0', 'Start - End')).toBe('Start > End');
    expect(getDirectedRoute('trip_1', 'Start - End')).toBe('End > Start');
  });

  test('timeSince returns minutes/seconds and just now', async () => {
    vi.doMock('react-leaflet', () => ({ TileLayer: () => null, useMap: () => null }));
    vi.doMock('leaflet', () => {
      const leaflet = { divIcon: () => ({}) };
      return { ...leaflet, default: leaflet };
    });
    const { timeSince } = await import('../utils');
    const now = Date.now();

    expect(timeSince(new Date(now - 5 * 1000))).toMatch(/seconds ago|just now/);
    expect(timeSince(new Date(now - 2 * 60 * 1000))).toMatch(/minutes ago/);
  });

  test('getIconByType and getNumberIcon call L.divIcon with expected html', async () => {
    vi.doMock('leaflet', () => {
      const leaflet = {
        divIcon: vi.fn(function divIcon(opts) {
          this.__icon = true;
          this.opts = opts;
        }),
        control: { fullscreen: () => ({ addTo: vi.fn(), remove: vi.fn() }) },
      };
      return { ...leaflet, default: leaflet };
    });
    vi.doMock('react-leaflet', () => ({ TileLayer: () => null, useMap: () => null }));

    const { getIconByType, getNumberIcon } = await import('../utils');
    const Leaflet = await import('leaflet');
    const bus = {
      vehicle_type: 3,
      route_id: 'r1',
      label: 'LabelX',
      bike_accessible: 'BIKE_ACCESSIBLE',
      wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE',
    };

    const routeM = { route_short_name: 'M1' };
    const iconM = getIconByType(bus, routeM);
    expect(Leaflet.divIcon).toHaveBeenCalled();
    expect(iconM.opts.html).toContain('🚴');

    const numIcon = getNumberIcon(4);
    expect(Leaflet.divIcon).toHaveBeenCalled();
    expect(numIcon.opts.html).toContain('5');
  });
});

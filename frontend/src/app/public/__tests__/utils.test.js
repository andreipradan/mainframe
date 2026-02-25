describe('public utils', () => {
  beforeEach(() => jest.resetModules());

  test('getDirectedRoute handles missing values and direction', () => {
    jest.isolateModules(() => {
      jest.doMock('react-leaflet', () => ({ TileLayer: () => null, useMap: () => null }));
      jest.doMock('leaflet', () => ({ divIcon: () => ({}) }));
      const { getDirectedRoute } = require('../utils');
      expect(getDirectedRoute(null, 'Route Name')).toBe('Route Name');
      expect(getDirectedRoute('trip_0', 'Start - End')).toBe('Start > End');
      expect(getDirectedRoute('trip_1', 'Start - End')).toBe('End > Start');
    });
  });

  test('timeSince returns minutes/seconds and just now', () => {
    jest.isolateModules(() => {
      jest.doMock('react-leaflet', () => ({ TileLayer: () => null, useMap: () => null }));
      jest.doMock('leaflet', () => ({ divIcon: () => ({}) }));
      const { timeSince } = require('../utils');
      const now = Date.now();
      expect(timeSince(new Date(now - 5 * 1000))).toMatch(/seconds ago|just now/);
      expect(timeSince(new Date(now - 2 * 60 * 1000))).toMatch(/minutes ago/);
    });
  });

  test('getIconByType and getNumberIcon call L.divIcon with expected html', () => {
    jest.isolateModules(() => {
      // mock leaflet and react-leaflet before importing utils
      jest.doMock('leaflet', () => ({
        divIcon: jest.fn((opts) => ({ __icon: true, opts })),
        control: { fullscreen: () => ({ addTo: jest.fn(), remove: jest.fn() }) },
      }));
      jest.doMock('react-leaflet', () => ({ TileLayer: () => null, useMap: () => null }));

      const { getIconByType, getNumberIcon } = require('../utils');
      const Leaflet = require('leaflet');

      const bus = {
        vehicle_type: 3,
        route_id: 'r1',
        label: 'LabelX',
        bike_accessible: 'BIKE_ACCESSIBLE',
        wheelchair_accessible: 'WHEELCHAIR_ACCESSIBLE',
      };

      // route short name starting with M changes color
      const routeM = { route_short_name: 'M1' };
      const iconM = getIconByType(bus, routeM);
      expect(Leaflet.divIcon).toHaveBeenCalled();
      expect(iconM.opts.html).toContain('🚴');

      const numIcon = getNumberIcon(4);
      expect(Leaflet.divIcon).toHaveBeenCalled();
      expect(numIcon.opts.html).toContain('5');
    });
  });
});

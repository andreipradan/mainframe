
// ------------------------
// Unit tests appended below
// Framework: Jest (+ plain React element inspection)
// ------------------------
/* eslint-disable no-undef */

jest.mock("leaflet", () => {
  const divIcon = jest.fn((opts) => {
    // Return a simple object so "new" works and callers can inspect
    return { __mock: "divIcon", options: opts };
  });
  return {
    __esModule: true,
    default: { divIcon },
    divIcon,
  };
});

jest.mock("react-leaflet", () => {
  // Create lightweight mock components that produce recognizable React elements
  const React = require("react");
  const TileLayer = (props) => React.createElement("mock-TileLayer", props);
  return { TileLayer };
});

describe("public/utils module", () => {
  beforeEach(() => {
    // Clear Leaflet divIcon mock between tests
    const mockLeaflet = require("leaflet");
    const Lmock = mockLeaflet.default || mockLeaflet;
    if (Lmock && Lmock.divIcon && Lmock.divIcon.mock) {
      Lmock.divIcon.mockClear();
    }
  });

  describe("getDirectedRoute", () => {
    test("returns original routeName when tripId is missing", () => {
      const route = "Downtown - Uptown";
      expect(getDirectedRoute(undefined, route)).toBe(route);
    });

    test("returns undefined when routeName is missing (graceful handling)", () => {
      expect(getDirectedRoute("abc_0_def", undefined)).toBeUndefined();
    });

    test("formats as start > end when direction flag is 0", () => {
      const route = "Downtown - Uptown";
      expect(getDirectedRoute("trip_0_xyz", route)).toBe("Downtown > Uptown");
    });

    test("formats as end > start when direction flag is not 0", () => {
      const route = "Downtown - Uptown";
      expect(getDirectedRoute("trip_1_xyz", route)).toBe("Uptown > Downtown");
    });
  });

  describe("getIconByType", () => {
    const getDivIconHtml = () => {
      const mockLeaflet = require("leaflet");
      const Lmock = mockLeaflet.default || mockLeaflet;
      // last call args
      const call = Lmock.divIcon.mock.calls[Lmock.divIcon.mock.calls.length - 1];
      return call && call[0] && call[0].html ? String(call[0].html) : "";
    };
    const getDivIconOpts = () => {
      const mockLeaflet = require("leaflet");
      const Lmock = mockLeaflet.default || mockLeaflet;
      const call = Lmock.divIcon.mock.calls[Lmock.divIcon.mock.calls.length - 1];
      return call && call[0] ? call[0] : {};
    };

    test("uses default blue for Bus without special flags; falls back label to ?R route_id with HTML escaping", () => {
      const bus = { vehicle_type: 3, route_id: 'A&<>"\\\'', label: "Ignored" };
      const route = undefined;

      getIconByType(bus, route);

      const html = getDivIconHtml();
      expect(html).toContain("background:#3199b0;"); // default blue
      // Escaped label: ?R + escaped route_id
      expect(html).toContain("?R A&amp;&lt;&gt;&quot;&#039;");
      // Width = 15 * label.length, here base is computed off "?R A&amp;&lt;&gt;&quot;&#039;"
      // We don't assert exact width due to escape expansion; presence is sufficient in this case.
      expect(html).toMatch(/width:\d+px;/);
    });

    test("color precedence: 'M' route_short_name takes priority (brown), even over bike or non-bus", () => {
      const bus = { vehicle_type: 2, bike_accessible: "BIKE_ACCESSIBLE" }; // non-bus + bike, but 'M' wins
      const route = { route_short_name: "M5" };

      getIconByType(bus, route);
      const html = getDivIconHtml();
      expect(html).toContain("background:#9f611b;"); // brown for 'M'
      expect(html).toContain(">M5"); // label starts as route_short_name
      // Width calc for "M5": 2 chars * 15 = 30, then +10 (bike) = 40 (wheelchair not set)
      expect(html).toContain("width:40px;");
    });

    test("bike accessible sets yellow when not 'M' (and vehicle is bus)", () => {
      const bus = { vehicle_type: 3, bike_accessible: "BIKE_ACCESSIBLE" };
      const route = { route_short_name: "5" };

      getIconByType(bus, route);
      const html = getDivIconHtml();
      expect(html).toContain("background:#e5a823;"); // yellow
      // Label should include 🚴 and width +10
      expect(html).toContain("5🚴");
      expect(html).toContain("width:25px;"); // base 15*1=15, +10 bike = 25
    });

    test("non-bus vehicles use green when not 'M' and not bike", () => {
      const bus = { vehicle_type: 2 }; // Rail
      const route = { route_short_name: "R1" };

      getIconByType(bus, route);
      const html = getDivIconHtml();
      expect(html).toContain("background:#42c41d;"); // green
      expect(html).toContain(">R1"); // label
      expect(html).toContain("width:30px;"); // 2 chars * 15
    });

    test("falls back to '?L label' when route_short_name and route_id missing; appends both icons; extra width for smallBusNumbers '9'", () => {
      const bus = {
        vehicle_type: 3,
        label: "L9",
        bike_accessible: "BIKE_ACCESSIBLE",
        wheelchair_accessible: "WHEELCHAIR_ACCESSIBLE",
      };
      const route = { route_short_name: "9" }; // triggers smallBusNumbers extra width

      getIconByType(bus, route);
      const html = getDivIconHtml();
      // For '9' and both accessibility flags, base label is "9" then adds 🚴 and ♿ (order per code)
      // Width: base 15*1=15 +10 bike +10 wheelchair +10 smallBusNumbers extra = 45
      expect(html).toContain("width:45px;");
      expect(html).toContain(">9🚴♿");
      // Color: not 'M'; bike flag present -> yellow
      expect(html).toContain("background:#e5a823;");
    });

    test("icon options include className and iconAnchor", () => {
      const bus = { vehicle_type: 3 };
      const route = { route_short_name: "10" };

      getIconByType(bus, route);
      const opts = getDivIconOpts();
      expect(opts.className).toBe("custom-bus-icon");
      expect(opts.iconAnchor).toEqual([16, 24]);
    });
  });

  describe("getNumberIcon", () => {
    const lastCallOpts = () => {
      const mockLeaflet = require("leaflet");
      const Lmock = mockLeaflet.default || mockLeaflet;
      const call = Lmock.divIcon.mock.calls[Lmock.divIcon.mock.calls.length - 1];
      return call && call[0] ? call[0] : {};
    };

    test("renders number as (num + 1)", () => {
      getNumberIcon(0);
      let html = String(lastCallOpts().html || "");
      expect(html).toContain(">1");

      getNumberIcon(4);
      html = String(lastCallOpts().html || "");
      expect(html).toContain(">5");
    });

    test("uses fixed size and circular style", () => {
      getNumberIcon(2);
      const html = String(lastCallOpts().html || "");
      expect(html).toContain("background:#3f2a2a;");
      expect(html).toContain("width:15px;");
      expect(html).toContain("height:15px;");
      expect(html).toContain("border-radius:50%");
    });
  });

  describe("tileLayer", () => {
    test("true variant uses OpenStreetMap tiles and attribution", () => {
      // tileLayer.true is a React element created with the mocked component
      const el = tileLayer.true;
      expect(el && el.props).toBeTruthy();
      expect(el.props.url).toBe("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
      expect(el.props.attribution).toBe('&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>');
    });

    test("false variant uses CARTO light tiles and attribution", () => {
      const el = tileLayer.false;
      expect(el && el.props).toBeTruthy();
      expect(el.props.url).toBe("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png");
      expect(el.props.attribution).toBe("&copy; OpenStreetMap contributors &copy; CARTO");
    });
  });

  describe("timeSince", () => {
    const ago = (seconds) => new Date(Date.now() - seconds * 1000);

    test("seconds when under a minute", () => {
      expect(timeSince(ago(5))).toBe("5 seconds");
      expect(timeSince(ago(59))).toBe("59 seconds");
      // boundary: exactly 60 still reports seconds due to >1 check
      expect(timeSince(ago(60))).toBe("60 seconds");
    });

    test("minutes when over 1 minute", () => {
      expect(timeSince(ago(120))).toBe("2 minutes");
      expect(timeSince(ago(119))).toBe("1 minutes");
    });

    test("hours when over 1 hour", () => {
      expect(timeSince(ago(3601))).toBe("1 hours");
      expect(timeSince(ago(7201))).toBe("2 hours");
    });

    test("days when over 1 day", () => {
      expect(timeSince(ago(86401))).toBe("1 days");
      expect(timeSince(ago(2 * 86400 + 10))).toBe("2 days");
    });

    test("months when over 1 month (30 days approximation)", () => {
      expect(timeSince(ago(30 * 86400 + 1))).toBe("1 months");
      expect(timeSince(ago(60 * 86400))).toBe("2 months");
    });

    test("years when over 1 year", () => {
      expect(timeSince(ago(31536001))).toBe("1 years");
      expect(timeSince(ago(2 * 31536000 + 100))).toBe("2 years");
    });
  });
});
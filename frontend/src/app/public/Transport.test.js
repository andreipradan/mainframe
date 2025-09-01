/* eslint-disable testing-library/no-node-access */
/* eslint-disable testing-library/no-container */
import React from "react";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";

// Use fake timers to test countdown/polling
jest.useFakeTimers();

// Mock react-redux hooks
jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (sel) =>
    sel({
      auth: { token: "TEST_TOKEN" },
      transit: {
        loading: false,
        errors: [],
        last_check: "2025-08-29T12:00:00Z",
        last_update: "2025-08-29T12:00:00Z",
        vehicles_etag: null,
        routes_etag: null,
        shapes_etag: null,
        stops_etag: null,
        stop_times_etag: null,
        trips_etag: null,
        // Vehicles used for filter scenarios
        vehicles: [
          // Active bus on Metro route (starts with 'M'), has bikes and wheelchair
          {
            id: "bus-metro-1",
            latitude: 46.771,
            longitude: 23.591,
            route_id: "R_METRO",
            trip_id: "TRIP_METRO_1",
            label: "Metro 1",
            speed: 30,
            timestamp: new Date("2025-08-29T11:59:00Z").toISOString(),
            bike_accessible: "BIKE_ACCESSIBLE",
            wheelchair_accessible: "WHEELCHAIR_ACCESSIBLE",
          },
          // Active bus non-metro, no bikes/wheelchair
          {
            id: "bus-12a-1",
            latitude: 46.772,
            longitude: 23.592,
            route_id: "R_12A",
            trip_id: "TRIP_12A_1",
            label: "12A-1",
            speed: 22,
            timestamp: new Date("2025-08-29T11:58:30Z").toISOString(),
            bike_accessible: "UNKNOWN",
            wheelchair_accessible: "UNKNOWN",
          },
          // Inactive bus (no trip_id) that should show only when Active filter is off
          {
            id: "bus-idle-1",
            latitude: 46.773,
            longitude: 23.593,
            route_id: "R_IDLE",
            trip_id: null,
            label: "Idle",
            speed: 0,
            timestamp: new Date("2025-08-29T11:57:00Z").toISOString(),
            bike_accessible: "UNKNOWN",
            wheelchair_accessible: "UNKNOWN",
          },
        ],
        routes: [
          { route_id: "R_METRO", route_short_name: "M1", route_long_name: "Metro North" },
          { route_id: "R_12A", route_short_name: "12A", route_long_name: "Downtown 12A" },
          { route_id: "R_IDLE", route_short_name: "99", route_long_name: "Idle Route" },
        ],
        shapes: [
          { shape_id: "TRIP_METRO_1", shape_pt_lat: 46.7715, shape_pt_lon: 23.5915 },
          { shape_id: "TRIP_METRO_1", shape_pt_lat: 46.7720, shape_pt_lon: 23.5920 },
        ],
        stops: [
          { stop_id: "S1", stop_lat: 46.774, stop_lon: 23.594, stop_name: "Main Stop", stop_desc: "Center" },
          { stop_id: "S2", stop_lat: 46.775, stop_lon: 23.595, stop_name: "Hill Stop", stop_desc: "Uphill" },
        ],
        stop_times: [
          { stop_id: "S1", trip_id: "TRIP_METRO_1", stop_sequence: 1, arrival_time: "12:05:00" },
          { stop_id: "S2", trip_id: "TRIP_METRO_1", stop_sequence: 2, arrival_time: "12:10:00" },
        ],
        trips: [
          { trip_id: "TRIP_METRO_1", trip_headsign: "To North", route_id: "R_METRO" },
          { trip_id: "TRIP_12A_1", trip_headsign: "To Downtown", route_id: "R_12A" },
        ],
      },
    }),
}));

// Mock API class used inside component
jest.mock("../../api/transport", () => ({
  TransitApi: function TransitApiMock() {
    return {
      getList: jest.fn(() => ({ type: "TEST_ACTION" })),
    };
  },
}));

// Mock toast to observe warnings
const toastWarnSpy = jest.fn();
jest.mock("react-toastify", () => ({
  toast: { warning: (...args) => toastWarnSpy(...args) },
}));
jest.mock("../../api/auth", () => ({ toastParams: { autoClose: 1 } }));

// Mock heavy map libs to lightweight pass-throughs
jest.mock("react-leaflet", () => {
  const React = require("react");
  const Pass = ({ children, ...rest }) => <div data-testid="rl-pass" {...rest}>{children}</div>;
  return {
    MapContainer: ({ children, ...rest }) => <div data-testid="map" {...rest}>{children}</div>,
    Marker: ({ children, ...rest }) => <div data-testid="marker" {...rest}>{children}</div>,
    Popup: Pass,
    Polyline: Pass,
    Tooltip: Pass,
  };
});
jest.mock("react-leaflet-cluster", () => {
  const React = require("react");
  return ({ children }) => <div data-testid="cluster">{children}</div>;
});
// Mock leaflet icon constructors used by component
jest.mock("leaflet", () => ({
  divIcon: jest.fn((opts) => ({ __mock: "divIcon", opts })),
}));

// Mock internal utils: return predictable elements/values
jest.mock("./utils", () => ({
  getDirectedRoute: (tripId, longName) => (tripId && longName ? `${longName} → end` : ""),
  getIconByType: () => ({ __mock: "icon" }),
  getNumberIcon: (n) => ({ __mock: "numicon", n }),
  // tileLayer indexed by boolean [false|true]
  tileLayer: { false: <div data-testid="tile" data-variant="a" />, true: <div data-testid="tile" data-variant="b" /> },
  timeSince: () => "1m",
}));

// Import after mocks in place
import Transport from "./Transport";

const getPlayPauseButton = () =>
  screen.getByRole("button", { name: /pause-circle-outline|play-circle-outline/i });
const getCogButton = () => screen.getByRole("button", { name: /cog/i });

describe("Transport (Public Transport) component", () => {
  beforeEach(() => {
    toastWarnSpy.mockClear();
  });

  test("renders header and map controls using @testing-library/react + Jest", () => {
    render(<Transport />);
    expect(screen.getByRole("heading", { name: /Public Transport/i })).toBeInTheDocument();
    // Map and tile are rendered
    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(screen.getAllByTestId("tile").length).toBe(1);
    // Search input defaults to buses placeholder
    expect(screen.getByPlaceholderText(/Search bus line/i)).toBeInTheDocument();
  });

  test("mode switching to 'stops' disables polling and updates UI", () => {
    render(<Transport />);
    // Initial state shows countdown
    expect(screen.getByText(/Polling stops in: \d+ seconds/)).toBeInTheDocument();

    // Switch to stops
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "stops" } });

    // Polling disabled message shown and countdown hidden
    expect(screen.getByText(/Last update:\s*polling disabled/i)).toBeInTheDocument();
    expect(screen.queryByText(/Polling stops in:/i)).not.toBeInTheDocument();

    // Placeholder updates
    expect(screen.getByPlaceholderText(/Search stop/i)).toBeInTheDocument();
  });

  test("countdown decreases over time while polling is enabled", () => {
    render(<Transport />);
    const initial = screen.getByText(/Polling stops in: \d+ seconds/);
    const initialValue = Number(initial.textContent.match(/(\d+)\s+seconds/)?.[1]);

    act(() => {
      jest.advanceTimersByTime(4000); // 4 seconds
    });

    const later = screen.getByText(/Polling stops in: \d+ seconds/);
    const laterValue = Number(later.textContent.match(/(\d+)\s+seconds/)?.[1]);
    expect(laterValue).toBeLessThan(initialValue);
  });

  test("play/pause button toggles polling and countdown visibility", () => {
    render(<Transport />);
    // Pause
    fireEvent.click(getPlayPauseButton());
    expect(screen.queryByText(/Polling stops in:/i)).not.toBeInTheDocument();
    // Play
    fireEvent.click(getPlayPauseButton());
    expect(screen.getByText(/Polling stops in: \d+ seconds/)).toBeInTheDocument();
  });

  test("vehicle markers filtered by Active, Bikes, Wheelchair, and Metro toggles", () => {
    render(<Transport />);

    const markers = () => screen.getAllByTestId("marker");

    // Default: Active only => idle vehicle excluded. Expect 2 markers (metro + 12A).
    expect(markers().length).toBe(2);

    // Toggle Metro-only
    const metroBtn = screen.getByRole("button", { name: /bus-side/i });
    fireEvent.click(metroBtn);
    expect(markers().length).toBe(1); // only M1

    // Toggle Bikes-only (bus has bikes; still 1)
    const bikesBtn = screen.getByRole("button", { name: /bike/i });
    fireEvent.click(bikesBtn);
    expect(markers().length).toBe(1);

    // Toggle Wheelchair-only (still 1)
    const wheelchairBtn = screen.getByRole("button", { name: /wheelchair/i });
    fireEvent.click(wheelchairBtn);
    expect(markers().length).toBe(1);

    // Turn off Active filter to include idle vehicle (but metro+bike+wheelchair still constrain to 1)
    const activeBtn = screen.getByRole("button", { name: /^bus$/i });
    fireEvent.click(activeBtn);
    expect(markers().length).toBe(1);

    // Clear all constraints and verify count increases
    fireEvent.click(metroBtn);
    fireEvent.click(bikesBtn);
    fireEvent.click(wheelchairBtn);
    expect(markers().length).toBe(3); // metro + 12A + idle
  });

  test("search filters vehicles by route short name and Escape clears input", () => {
    render(<Transport />);

    const search = screen.getByPlaceholderText(/Search bus line/i);
    // Search for 'm' (lowercase), only M1 remains
    fireEvent.change(search, { target: { value: "m" } });
    expect(screen.getAllByTestId("marker").length).toBe(1);

    // Press Escape -> clears search -> back to default active-only (2 markers)
    fireEvent.keyDown(search, { key: "Escape" });
    expect(search).toHaveValue("");
    expect(screen.getAllByTestId("marker").length).toBe(2);
  });

  test("map type toggle switches icon class (mdi-map vs mdi-map-check)", () => {
    render(<Transport />);
    const mapBtn = screen.getByRole("button", { name: /map/i });
    // initial: mdi-map (no -check)
    expect(mapBtn.querySelector(".mdi.mdi-map")).toBeInTheDocument();
    fireEvent.click(mapBtn);
    // after toggle: mdi-map-check
    expect(mapBtn.querySelector(".mdi.mdi-map-check")).toBeInTheDocument();
  });

  test("fields panel shows Bus fields and Stop fields with proper labels", () => {
    render(<Transport />);
    // Open fields panel
    fireEvent.click(getCogButton());

    // Bus fields visible in buses mode; labels format underscores
    expect(screen.getByText(/Bus fields/i)).toBeInTheDocument();

    // Switch to stops and verify Stop fields appear
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "stops" } });
    fireEvent.click(getCogButton()); // ensure panel remains visible if needed

    expect(screen.getByText(/Stop fields/i)).toBeInTheDocument();
  });

  test("auto-disables polling after 240s and shows toast warning", () => {
    render(<Transport />);
    // Ensure polling is enabled initially
    expect(screen.getByText(/Polling stops in:/i)).toBeInTheDocument();

    // Advance beyond 240s to trigger disable inside fetchTransit polling interval
    act(() => {
      jest.advanceTimersByTime(241_000);
    });

    // UI reflects disabled polling
    expect(screen.getByText(/Last update:\s*polling disabled/i)).toBeInTheDocument();

    // Toast shown
    expect(toastWarnSpy).toHaveBeenCalled();
    const [content] = toastWarnSpy.mock.calls[0];
    // Content is a React element; stringify for a basic assertion
    expect(JSON.stringify(content)).toMatch(/Polling disabled/i);
  });

  test("switching to 'stops' renders stop markers via cluster wrapper", () => {
    render(<Transport />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "stops" } });
    // Cluster container present and markers equal to stops count
    expect(screen.getByTestId("cluster")).toBeInTheDocument();
    const stopsMarkers = screen.getAllByTestId("marker");
    expect(stopsMarkers.length).toBe(2);
  });
});
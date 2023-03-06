import { createSlice } from "@reduxjs/toolkit";

export const devicesSlice = createSlice({
  name: "devices",
  initialState: {
    errors: null,
    loading: false,
    loadingDevices: null,
    results: null,
    selectedDevice: null,
  },
  reducers: {
    deleteDevice: (state, action) => {
      state.errors = null;
      state.loadingDevices = state.loadingDevices?.filter((device) => device.id === action.payload);
      state.results = state.results.filter((device) => device.id !== action.payload);
      state.selectedDevice = null
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    select: (state, action) => {
      state.selectedDevice = action.payload ? state.results.find(device => device.id === action.payload) : null
    },
    set: (state, action) => {
      state.errors = null
      state.loading = false
      state.loadingDevices = null;
      state.results = action.payload.results;
    },
    setLoading: (state, action) => {state.loading = action.payload},
    setLoadingDevice: (state, action) => {
      state.loadingDevices = !state.loadingDevices
        ? [action.payload]
        : [...state.loadingDevices, action.payload];
    },
    update: (state, action) => {
      state.errors = null;
      state.loadingDevices = state.loadingDevices?.filter((device) => device.id === action.payload.id);
      state.results = state.results.map((device) =>
        (device.id === action.payload.id ? action.payload : device)).sort((a, b) =>
          b.is_active === a.is_active
            ? a.name === b.name
              ? a.ip > b.ip ? 1 : -1
              : a.name > b.name ? 1 : -1
            : b.is_active > a.is_active ? 1 : -1
      );
    },
  },
});

export const { deleteDevice, select, set, setErrors, setLoading, setLoadingDevice, update } =
  devicesSlice.actions;

export default devicesSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";

export const lightsSlice = createSlice({
  name: "lights",
  initialState: {
    errors: null,
    list: null,
    loading: false,
    loadingLights: false,
  },
  reducers: {
    set: (state, action) => {
      state.list = action.payload;
      state.errors = null;
      state.loading = false;
    },
    setBrightness: (state, action) => {
      state.list = state.list.map((l) => (l.ip !== action.payload.ip
        ? l
        : {...l, capabilities: {...l.capabilities, bright: action.payload.brightness}}
      ));
      state.errors = null;
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    setLoading: (state, action) => {
      state.list = null;
      state.loading = action.payload;
    },
    setLoadingLight: (state, action) => {
      state.loadingLights = !state.loadingLights
        ? [action.payload]
        : [...state.loadingLights, action.payload];
    },
    turn_off: (state, action) => {
      state.list = state.list.map((l) => (l.ip !== action.payload
        ? l
        : {...l, capabilities: {...l.capabilities, power: "off"}}
      ));
      state.errors = null;
    },
    turn_on: (state, action) => {
      state.list = state.list.map((l) => (l.ip !== action.payload
        ? l
        : {...l, capabilities: {...l.capabilities, power: "on"}}
      ));
      state.errors = null;
    },
  },
});

export const { set, setBrightness, setLoading, setLoadingLight, turn_off, turn_on } = lightsSlice.actions;
export default lightsSlice.reducer;

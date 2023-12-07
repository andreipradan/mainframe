import { createSlice } from "@reduxjs/toolkit";

export const lightsSlice = createSlice({
  name: "lights",
  initialState: {
    errors: null,
    list: null,
    loading: false,
    loadingLights: null,
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
        : {...l, capabilities: {...l.capabilities, power: "on", bright: action.payload.brightness}}
      ));
      state.errors = null;
      state.loadingLights = state.loadingLights.filter(ip => ip !== action.payload.ip)
    },
    setColorTemp: (state, action) => {
      state.list = state.list.map((l) => (l.ip !== action.payload.ip
        ? l
        : {...l, capabilities: {...l.capabilities, power: "on", ct: action.payload.colorTemp}}
      ));
      state.errors = null;
      state.loadingLights = state.loadingLights.filter(ip => ip !== action.payload.ip)
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setLoadingLight: (state, action) => {
      state.loadingLights = !state.loadingLights
        ? [action.payload]
        : [...state.loadingLights, action.payload];
    },
    setName: (state, action) => {
      state.list = state.list.map((l) => (l.ip !== action.payload.ip
        ? l
        : {...l, capabilities: {...l.capabilities, name: action.payload.name}}
      ));
      state.errors = null;
      state.loadingLights = state.loadingLights.filter(ip => ip !== action.payload.ip)
    },
    turn_all_off: (state, action) => {
      state.list = state.list?.map(l => ({...l, capabilities: {...l.capabilities, power: "off"}}));
      state.errors = null;
      state.loading = false;
    },
    turn_all_on: (state, action) => {
      state.list = state.list?.map((l) => ({...l, capabilities: {...l.capabilities, power: "on"}}));
      state.errors = null;
      state.loading = false;
    },
    turn_off: (state, action) => {
      state.list = state.list.map((l) => (l.ip !== action.payload
        ? l
        : {...l, capabilities: {...l.capabilities, power: "off"}}
      ));
      state.errors = null;
      state.loadingLights = state.loadingLights.filter(ip => ip !== action.payload)
    },
    turn_on: (state, action) => {
      state.list = state.list.map((l) => (l.ip !== action.payload
        ? l
        : {...l, capabilities: {...l.capabilities, power: "on"}}
      ));
      state.errors = null;
      state.loadingLights = state.loadingLights.filter(ip => ip !== action.payload)
    },
    unsetLoadingLight: (state, action) => {
      state.loadingLights = state.loadingLights?.filter(ip => ip !== action.payload);
    },
  },
});

export const {
  set,
  setBrightness,
  setColorTemp,
  setErrors,
  setLoading,
  setLoadingLight,
  setName,
  turn_all_off,
  turn_all_on,
  turn_off,
  turn_on,
  unsetLoadingLight
} = lightsSlice.actions;
export default lightsSlice.reducer;

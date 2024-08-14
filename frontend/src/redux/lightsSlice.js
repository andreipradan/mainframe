import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const lightsSlice = createSlice(getBaseSliceOptions(
  "lights",
  {},
  {
    setBrightness: (state, action) => {
      state.results = state.results.map((l) => (l.ip !== action.payload.ip
        ? l
        : {...l, capabilities: {...l.capabilities, power: "on", bright: action.payload.brightness}}
      ));
      state.errors = null;
      state.loadingItems = state.loadingItems.filter(ip => ip !== action.payload.ip)
    },
    setColorTemp: (state, action) => {
      state.results = state.results.map((l) => (l.ip !== action.payload.ip
        ? l
        : {...l, capabilities: {...l.capabilities, power: "on", ct: action.payload.colorTemp}}
      ));
      state.errors = null;
      state.loadingItems = state.loadingItems.filter(ip => ip !== action.payload.ip)
    },
    setName: (state, action) => {
      state.results = state.results.map((l) => (l.ip !== action.payload.ip
        ? l
        : {...l, capabilities: {...l.capabilities, name: action.payload.name}}
      ));
      state.errors = null;
      state.loadingItems = state.loadingItems.filter(ip => ip !== action.payload.ip)
    },
    turn_all: (state, action) => {
      state.results = state.results?.map(l => ({...l, capabilities: {...l.capabilities, power: action.data}}));
      state.errors = null;
      state.loading = false;
    },
    turn_off: (state, action) => {
      state.results = state.results.map((l) => (l.ip !== action.payload
        ? l
        : {...l, capabilities: {...l.capabilities, power: "off"}}
      ));
      state.errors = null;
      state.loadingItems = state.loadingItems.filter(ip => ip !== action.payload)
    },
    turn_on: (state, action) => {
      state.results = state.results.map((l) => (l.ip !== action.payload
        ? l
        : {...l, capabilities: {...l.capabilities, power: "on"}}
      ));
      state.errors = null;
      state.loadingItems = state.loadingItems.filter(ip => ip !== action.payload)
    },
    unsetLoadingLight: (state, action) => {
      state.loadingItems = state.loadingItems?.filter(ip => ip !== action.payload);
    },
  },
))

export const {
  set,
  setBrightness,
  setColorTemp,
  setErrors,
  setLoading,
  setLoadingItems,
  setName,
  turn_all,
  turn_off,
  turn_on,
  unsetLoadingLight
} = lightsSlice.actions;
export default lightsSlice.reducer;

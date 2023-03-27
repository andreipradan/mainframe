import { createSlice } from "@reduxjs/toolkit";

export const earthquakesSlice = createSlice({
  name: "earthquakes",
  initialState: {
    count: 0,
    errors: null,
    loading: false,
    next: null,
    previous: null,
    results: null,
  },
  reducers: {
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
      state.loadingBots = null;
    },
    set: (state, action) => {
      state.count = action.payload.count
      state.errors = null
      state.loading = false
      state.next = action.payload.next
      state.previous = action.payload.previous
      state.results = action.payload.results;
    },
    setLoading: (state, action) => {state.loading = action.payload},
  },
});

export const { set, setErrors, setLoading } =
  earthquakesSlice.actions;

export default earthquakesSlice.reducer;

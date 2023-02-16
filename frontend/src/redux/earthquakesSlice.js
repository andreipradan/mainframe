import { createSlice } from "@reduxjs/toolkit";

export const earthquakesSlice = createSlice({
  name: "earthquakes",
  initialState: {
    errors: null,
    list: null,
    loading: false,
  },
  reducers: {
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
      state.loadingBots = null;
    },
    set: (state, action) => {
      state.list = action.payload;
      state.errors = null;
      state.loading = false;
      state.loadingBots = null;
    },
    setLoading: (state, action) => {
      state.list = null;
      state.loading = action.payload;
    },
  },
});

export const { set, setErrors, setLoading } =
  earthquakesSlice.actions;

export default earthquakesSlice.reducer;

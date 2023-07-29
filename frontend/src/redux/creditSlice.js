import { createSlice } from "@reduxjs/toolkit";

export const creditSlice = createSlice({
  name: "credit",
  initialState: {
    errors: null,
    loading: false,
    details: null,
  },
  reducers: {
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    set: (state, action) => {
      state.errors = null
      state.loading = false
      state.details = action.payload;
    },
    setLoading: (state, action) => {state.loading = action.payload},
  },
});
export const { set, setErrors, setLoading } = creditSlice.actions;
export default creditSlice.reducer;

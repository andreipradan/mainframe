import { createSlice } from "@reduxjs/toolkit";

export const rpiSlice = createSlice({
  name: "rpi",
  initialState: {
    errors: null,
    loading: false,
  },
  reducers: {
    completed: (state, action) => {
      state.errors = null
      state.loading = false
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    setLoading: (state, action) => {state.loading = action.payload},
  },
});
export const { completed, setErrors, setLoading } = rpiSlice.actions;
export default rpiSlice.reducer;

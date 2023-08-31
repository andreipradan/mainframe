import { createSlice } from "@reduxjs/toolkit";

export const categoriesSlice = createSlice({
  name: "categories",
  initialState: {
    count: 0,
    errors: null,
    loading: false,
    next: null,
    previous: null,
    results: null,
  },
  reducers: {
    set: (state, action) => {
      state.count = action.payload.count
      state.errors = null
      state.loading = false
      state.next = action.payload.next
      state.previous = action.payload.previous
      state.results = action.payload.results;
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
      state.loadingAccounts = null
    },
    setLoading: (state, action) => {state.loading = action.payload},
  },
});
export const {
  set,
  setErrors,
  setLoading,
} = categoriesSlice.actions;
export default categoriesSlice.reducer;

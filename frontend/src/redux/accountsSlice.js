import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from './shared';

export const accountsSlice = createSlice(getBaseSliceOptions(
  "accounts",
  {analytics: null, newAccount: false},
  {
    setAnalytics: (state, action) => {
      state.analytics = action.payload
      state.errors = null
      state.loading = false
    },
  }
))
export const {
  create,
  selectItem,
  set,
  setAnalytics,
  setErrors,
  setLoading,
  setModalOpen,
  update
} = accountsSlice.actions;
export default accountsSlice.reducer;

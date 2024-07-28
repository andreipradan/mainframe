import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from './shared';

export const categoriesSlice = createSlice(getBaseSliceOptions("categories"))
export const {
  create,
  selectItem,
  set,
  setErrors,
  setLoading,
} = categoriesSlice.actions;
export default categoriesSlice.reducer;

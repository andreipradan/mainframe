import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const investmentsSlice = createSlice(getBaseSliceOptions("investments"));
export const {
  set,
  setErrors,
  setLoading,
} = investmentsSlice.actions;
export default investmentsSlice.reducer;

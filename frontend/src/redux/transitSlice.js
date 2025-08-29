import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const transitSlice = createSlice(getBaseSliceOptions("transit"));
export const {
  set,
  setErrors,
  setLoading,
  setKwargs,
} = transitSlice.actions;
export default transitSlice.reducer;

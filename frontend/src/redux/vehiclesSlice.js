import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const vehiclesSlice = createSlice(getBaseSliceOptions("vehicles"));
export const {
  set,
  setErrors,
  setLoading,
  setKwargs,
} = vehiclesSlice.actions;
export default vehiclesSlice.reducer;

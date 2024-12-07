import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const cryptoSlice = createSlice(getBaseSliceOptions("crypto"));
export const {
  set,
  setErrors,
  setLoading,
  setKwargs
} = cryptoSlice.actions;
export default cryptoSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const pnlSlice = createSlice(getBaseSliceOptions("pnl"));
export const { set, setErrors, setLoading, setKwargs } = pnlSlice.actions;
export default pnlSlice.reducer;

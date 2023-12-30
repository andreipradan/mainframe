import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const stocksSlice = createSlice(getBaseSliceOptions("stocks"));
export const { set, setErrors, setLoading, setKwargs } = stocksSlice.actions;
export default stocksSlice.reducer;

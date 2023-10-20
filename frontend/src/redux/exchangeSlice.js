import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const exchangeSlice = createSlice(getBaseSliceOptions("exchange", {kwargs: {from_currency: "USD"}}));
export const { set, setErrors, setKwargs, setLoading } = exchangeSlice.actions;
export default exchangeSlice.reducer;

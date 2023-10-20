import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const paymentSlice = createSlice(getBaseSliceOptions("payment"));
export const { selectItem, set, setErrors, setKwargs, setLoading, setLoadingItems, update } = paymentSlice.actions;
export default paymentSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const mealsSlice = createSlice(getBaseSliceOptions("meals"));
export const { selectItem, set, setErrors, setLoading } = mealsSlice.actions;
export default mealsSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const creditSlice = createSlice(getBaseSliceOptions("credit"));
export const { set, setErrors, setLoading } = creditSlice.actions;
export default creditSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const expensesSlice = createSlice(getBaseSliceOptions("expenses"));
export const { set, setErrors, selectItem, setKwargs, setLoading } = expensesSlice.actions;
export default expensesSlice.reducer;

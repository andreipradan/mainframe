import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const transactionsSlice = createSlice(getBaseSliceOptions("transactions"))

export const {deleteItem, selectItem, set, setExtra, setErrors, setKwargs, setLoading, setLoadingItems, update} = transactionsSlice.actions;
export default transactionsSlice.reducer;

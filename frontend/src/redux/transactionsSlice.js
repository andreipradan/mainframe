import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const transactionsSlice = createSlice(getBaseSliceOptions("transactions"))

export const {
  deleteItem,
  selectItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setExtra,
  setItem,
  setKwargs,
  setLoading,
  setLoadingItems,
  update
} = transactionsSlice.actions;
export default transactionsSlice.reducer;

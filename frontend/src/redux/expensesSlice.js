import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const expensesSlice = createSlice(getBaseSliceOptions("expenses"));
export const {
  create,
  loadingItems,
  selectItem,
  set,
  setErrors,
  setItem,
  setKwargs,
  setLoading,
  setLoadingItems,
  setModalOpen,
  update,
} = expensesSlice.actions;
export default expensesSlice.reducer;

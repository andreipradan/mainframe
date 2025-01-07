import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const groupsSlice = createSlice(getBaseSliceOptions("groups"));
export const {
  create,
  deleteItem,
  selectItem,
  set,
  setErrors,
  setKwargs,
  setLoading,
  setLoadingItems,
} = groupsSlice.actions;
export default groupsSlice.reducer;

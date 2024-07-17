import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const timetableSlice = createSlice(getBaseSliceOptions("timetable"));
export const {
  create,
  deleteItem,
  selectItem,
  set,
  setErrors,
  setItem,
  setLoading,
  setLoadingItems,
} = timetableSlice.actions;
export default timetableSlice.reducer;

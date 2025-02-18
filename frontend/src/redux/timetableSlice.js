import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const timetableSlice = createSlice(getBaseSliceOptions("timetable"));
export const {
  create,
  deleteItem,
  selectItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setItem,
  setLoading,
  setLoadingItems,
  update,
} = timetableSlice.actions;
export default timetableSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from './shared';

export const activitySlice = createSlice(getBaseSliceOptions("activity"));

export const {
  set,
  setErrors,
  setLoading,
} =
  activitySlice.actions;

export default activitySlice.reducer;

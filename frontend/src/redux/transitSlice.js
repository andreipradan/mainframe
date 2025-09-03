import { createSlice } from '@reduxjs/toolkit';
import { getBaseSliceOptions } from './shared';

export const transitSlice = createSlice(
  getBaseSliceOptions('transit', {
    pollingEnabled: true,
  })
);
export const { set, setErrors, setLoading, setKwargs, setOnly } =
  transitSlice.actions;
export default transitSlice.reducer;

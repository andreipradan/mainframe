import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from './shared';

export const devicesSlice = createSlice(getBaseSliceOptions("devices"));

export const {
  create,
  deleteItem,
  selectItem,
  set,
  setErrors,
  setLoading,
  setLoadingItems,
  setModalOpen,
  update
} =
  devicesSlice.actions;

export default devicesSlice.reducer;

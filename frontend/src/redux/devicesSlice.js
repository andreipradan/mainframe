import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from './shared';

export const devicesSlice = createSlice(getBaseSliceOptions("devices"));

export const {
  create,
  deleteItem,
  selectItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setLoading,
  setLoadingItems,
  setModalOpen,
  update
} =
  devicesSlice.actions;

export default devicesSlice.reducer;

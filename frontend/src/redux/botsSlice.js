import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from './shared';

export const botsSlice = createSlice(getBaseSliceOptions("bots"))
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
} = botsSlice.actions;

export default botsSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const carSlice = createSlice(getBaseSliceOptions("car"));
export const {
  create,
  deleteItem,
  selectItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setLoading,
  setLoadingItems,
  setKwargs,
  setModalOpen,
  update,
} = carSlice.actions;
export default carSlice.reducer;

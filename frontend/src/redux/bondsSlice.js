import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const bondsSlice = createSlice(getBaseSliceOptions("bonds"));
export const {
  create,
  selectItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setLoading,
  setLoadingItems,
  setKwargs,
  setModalOpen,
  update,
} = bondsSlice.actions;
export default bondsSlice.reducer;

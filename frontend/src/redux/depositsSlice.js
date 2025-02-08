import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const depositsSlice = createSlice(getBaseSliceOptions("deposits"));
export const {
  create,
  selectItem,
  set,
  setErrors,
  setLoading,
  setLoadingItems,
  setKwargs,
  setModalOpen,
  update,
} = depositsSlice.actions;
export default depositsSlice.reducer;

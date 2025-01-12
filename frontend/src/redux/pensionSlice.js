import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const pensionSlice = createSlice(getBaseSliceOptions("pension"));
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
} = pensionSlice.actions;
export default pensionSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const sourcesSlice = createSlice(getBaseSliceOptions("sources"));
export const {
  create,
  deleteItem,
  selectItem,
  set,
  setErrors,
  setKwargs,
  setLoading,
  setLoadingItems,
  setModalOpen,
  update,
} = sourcesSlice.actions;
export default sourcesSlice.reducer;

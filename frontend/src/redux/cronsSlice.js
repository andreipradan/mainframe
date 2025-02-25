import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from './shared';
export const cronsSlice = createSlice(getBaseSliceOptions(
  "crons", {ordering: ["-is_active", "name"]}
));

export const {
  create,
  deleteItem: deleteCron,
  selectItem: select,
  set,
  setCompletedLoadingItem,
  setErrors,
  setLoading,
  setLoadingItems: setLoadingCron,
  setModalOpen,
  update
} =
  cronsSlice.actions;

export default cronsSlice.reducer;

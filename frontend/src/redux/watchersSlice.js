import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const watchersSlice = createSlice(getBaseSliceOptions("watchers"));
export const {
  create, modalOpen, selectItem, set, setCompletedLoadingItem, setErrors, setItem, setLoading, setLoadingItems, setModalOpen, update,
} = watchersSlice.actions;
export default watchersSlice.reducer;

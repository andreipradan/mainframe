import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const tasksSlice = createSlice(getBaseSliceOptions("tasks"));
export const { selectItem, set, setErrors, setLoading, setModalOpen, setLoadingItems, update } = tasksSlice.actions;
export default tasksSlice.reducer;

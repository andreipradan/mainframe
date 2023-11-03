import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const commandsSlice = createSlice(getBaseSliceOptions("commands"));
export const { set, setErrors, setLoading, setLoadingItems } = commandsSlice.actions;
export default commandsSlice.reducer;

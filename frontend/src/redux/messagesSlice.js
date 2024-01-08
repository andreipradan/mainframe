import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const messagesSlice = createSlice(getBaseSliceOptions("messages"));
export const { selectItem, set, setErrors, setLoading, setModalOpen, setLoadingItems } = messagesSlice.actions;
export default messagesSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const timetableSlice = createSlice(getBaseSliceOptions("timetable"));
export const { deleteItem, selectItem, set, setErrors, setLoading } = timetableSlice.actions;
export default timetableSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const earthquakesSlice = createSlice(getBaseSliceOptions("earthquakes", {kwargs: {local_events: true}}));
export const { set, setErrors, setLoading, setKwargs } = earthquakesSlice.actions;
export default earthquakesSlice.reducer;

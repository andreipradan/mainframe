import { createSlice } from "@reduxjs/toolkit";
import {getBaseSliceOptions} from "./shared";

export const transactionsSlice = createSlice(getBaseSliceOptions(
    "transactions",
    {
      kwargs: {
        confirmed_by: 0,
        expense: true,
        unique: true,
        page: 1,
        pending: null
      }
    })
)

export const {selectItem, set, setErrors, setKwargs, setLoading, setLoadingItems, update} = transactionsSlice.actions;
export default transactionsSlice.reducer;

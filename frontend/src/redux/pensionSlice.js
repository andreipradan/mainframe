import { createSlice } from "@reduxjs/toolkit";
import { getBaseSliceOptions } from "./shared";

export const pensionSlice = createSlice(getBaseSliceOptions(
  "pension",
  {},
  {
    deleteContribution: (state, action) => {
      state.results = state.results.map(pension =>
        pension.id !== action.payload.pensionId
          ? pension
          : {
            ...pension,
            contributions: pension.contributions.filter(c =>c.id !== action.payload.contributionId)
          }
      )
      state.loadingItems = state.loadingItems
        ? state.loadingItems.filter(id => id !== action.payload.pensionId)
        : null
      state.loading = false
      state.errors = null
    }
  }
));
export const {
  create,
  deleteContribution,
  selectItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setLoading,
  setLoadingItems,
  setKwargs,
  setModalOpen,
  update,
} = pensionSlice.actions;
export default pensionSlice.reducer;

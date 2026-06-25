import { createSlice } from '@reduxjs/toolkit';
import { getBaseSliceOptions } from './shared';

export const favoritesSlice = createSlice(
  getBaseSliceOptions(
    'favorites',
    {
      favoritesFilter: false,
    },
    {
      setFavoritesFilter: (state, action) => {
        state.favoritesFilter = action.payload;
      },
    }
  )
);

export const {
  create,
  deleteItem,
  selectItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setFavoritesFilter,
  setKwargs,
  setLoading,
  setLoadingItems,
  setModalOpen,
  update,
} = favoritesSlice.actions;

export default favoritesSlice.reducer;

import { createSlice } from '@reduxjs/toolkit';
import { getBaseSliceOptions } from './shared';

export const eventsSlice = createSlice(
  getBaseSliceOptions('events', {
    ordering: ['-start_date', 'title'],
  })
);

export const {
  create,
  deleteItem,
  selectItem,
  set,
  setCompletedLoadingItem,
  setErrors,
  setKwargs,
  setLoading,
  setLoadingItems,
  setModalOpen,
  update,
} = eventsSlice.actions;

export default eventsSlice.reducer;

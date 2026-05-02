import { createSlice } from '@reduxjs/toolkit';
import { getBaseSliceOptions } from './shared';
export const cronsSlice = createSlice(
  getBaseSliceOptions('crons', { ordering: ['-is_active', 'name'] })
);

export const {
  create,
  deleteItem: deleteCron,
  selectItem: select,
  set,
  setCompletedLoadingItem,
  setErrors,
  setKwargs,
  setLoading,
  setLoadingItems: setLoadingCron,
  setModalOpen,
  update,
} = cronsSlice.actions;

export default cronsSlice.reducer;

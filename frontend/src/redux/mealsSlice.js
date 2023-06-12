import { createSlice } from "@reduxjs/toolkit";

export const mealsSlice = createSlice({
  name: "meals",
  initialState: {
    count: 0,
    errors: null,
    loading: false,
    results: null,
    selectedMeal: null,
  },
  reducers: {
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    select: (state, action) => {
      state.selectedMeal = action.payload ? state.results.find(meal => meal.id === action.payload) : null
    },
    set: (state, action) => {
      state.count = action.payload.count
      state.errors = null
      state.loading = false
      state.results = action.payload.results;
    },
    setLoading: (state, action) => {state.loading = action.payload},
  },
});

export const { select, set, setErrors, setLoading } = mealsSlice.actions;

export default mealsSlice.reducer;

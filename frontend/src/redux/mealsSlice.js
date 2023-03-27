import { createSlice } from "@reduxjs/toolkit";

export const mealsSlice = createSlice({
  name: "meals",
  initialState: {
    errors: null,
    loading: false,
    loadingMeals: null,
    results: null,
    selectedMeal: null,
  },
  reducers: {
    deleteMeal: (state, action) => {
      state.errors = null;
      state.loadingMeals = state.loadingMeals?.filter((meal) => meal.id === action.payload);
      state.results = state.results.filter((meal) => meal.id !== action.payload);
      state.selectedMeal = null
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    select: (state, action) => {
      state.selectedMeal = action.payload ? state.results.find(meal => meal.id === action.payload) : null
    },
    set: (state, action) => {
      state.errors = null
      state.loading = false
      state.loadingMeals = null;
      state.results = action.payload.results;
    },
    setLoading: (state, action) => {state.loading = action.payload},
    setLoadingMeal: (state, action) => {
      state.loadingMeals = !state.loadingMeals
        ? [action.payload]
        : [...state.loadingMeals, action.payload];
    },
  },
});

export const { deleteMeal, select, set, setErrors, setLoading, setLoadingMeal, update } =
  mealsSlice.actions;

export default mealsSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";

export const trainingSlice = createSlice({
  name: "training",
  initialState: {
    count: 0,
    errors: null,
    loading: false,
    loadingTasks: null,
    results: null,
  },
  reducers: {
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    set: (state, action) => {
      state.count = action.payload.count
      state.errors = null
      state.loading = false
      state.results = action.payload.results;
    },
    setLoading: (state, action) => {state.loading = action.payload},
    setLoadingTask: (state, action) => {
      state.loadingTasks = state.loadingTasks?.length
        ? [...state.loadingTasks, action.payload]
        : [action.payload]
    },
    setTrainingTask: (state, action) => {
      state.results = state.results?.length
        ? state.results.find(t => t.id === action.payload.id)
          ? state.results.map(t =>
            t.id !== action.payload.id ? t : action.payload)
          : [action.payload, ...state.results]
        : [action.payload]
      state.loadingTasks = state.loadingTasks?.length
        ? state.loadingTasks.filter(t => t !== action.payload.id)
        : null
      state.errors = null
      state.loading = false
    },
  },
});

export const { set, setErrors, setLoading, setLoadingTask, setTrainingTask } = trainingSlice.actions;
export default trainingSlice.reducer;

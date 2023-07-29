import { createSlice } from "@reduxjs/toolkit";

export const timetableSlice = createSlice({
  name: "timetable",
  initialState: {
    count: 0,
    errors: null,
    loading: false,
    loadingTimetables: null,
    next: null,
    previous: null,
    results: null,
    selectedTimetable: null,
  },
  reducers: {
    deleteTimetable: (state, action) => {
      state.count -= 1
      state.errors = null
      state.results = state.results.filter((t) => t.id !== action.payload)
    },
    selectTimetable: (state, action) => {
      state.selectedTimetable = action.payload ? state.results.find(t => t.id === action.payload) : null
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    set: (state, action) => {
      state.count = action.payload.count
      state.errors = null
      state.loading = false
      state.next = action.payload.next
      state.previous = action.payload.previous
      state.results = action.payload.results;
    },
    setLoading: (state, action) => {state.loading = action.payload},
  },
});
export const { deleteTimetable, selectTimetable, set, setErrors, setLoading, setOverview } = timetableSlice.actions;
export default timetableSlice.reducer;

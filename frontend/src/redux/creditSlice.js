import { createSlice } from "@reduxjs/toolkit";

export const creditSlice = createSlice({
  name: "credit",
  initialState: {
    count: 0,
    errors: null,
    loading: false,
    next: null,
    overview: null,
    previous: null,
    results: null,
    selectedTimetable: null,
  },
  reducers: {
    deleteTimetable: (state, action) => {
      state.count -= 1
      state.errors = null
      state.overview.timetables = state.overview.timetables.filter((t) => t.id !== action.payload)
    },
    selectTimetable: (state, action) => {
      state.selectedTimetable = action.payload ? state.overview.timetables.find(t => t.id === action.payload) : null
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
    setOverview: (state, action) => {
      state.overview = action.payload
      state.loading = false
    }
  },
});
export const { deleteTimetable, selectTimetable, set, setErrors, setLoading, setOverview } = creditSlice.actions;
export default creditSlice.reducer;

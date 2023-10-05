import { createSlice } from "@reduxjs/toolkit";

export const usersSlice = createSlice({
  name: "users",
  initialState: {
    count: 0,
    errors: null,
    loading: false,
    loadingUsers: null,
    next: null,
    previous: null,
    results: null,
    selectedUser: null,
  },
  reducers: {
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
      state.loadingUsers = null;
    },
    selectUser: (state, action) => {
      state.selectedUser = action.payload ? state.results.find(t => t.id === action.payload) : null
      state.modalOpen = !!action.payload
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
    setLoadingUsers: (state, action) => {
      state.loadingUsers = !state.loadingUsers
        ? [action.payload]
        : [...state.loadingUsers, action.payload];
    },
    setModalOpen: (state, action) => {
      state.modalOpen = action.payload
    },
    setUser: (state, action) => {
      state.errors = null
      state.loading = false
      state.loadingUsers = state.loadingUsers ? state.loadingUsers.filter(id => id !== action.payload.id) : null
      state.selectedUser = action.payload
    },
    updateUser: (state, action) => {
      state.errors = null;
      state.loadingUsers = state.loadingUsers?.filter((id) => id !== action.payload.id);
      state.results = state.results.map((a) => (a.id === action.payload.id ? action.payload : a));
      state.selectedUser = null
      state.modalOpen = false;
    }
  },
});

export const { selectUser, setUser, set, setErrors, setLoading, setLoadingUsers, setModalOpen, updateUser } =
  usersSlice.actions;

export default usersSlice.reducer;

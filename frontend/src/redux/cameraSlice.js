import { createSlice } from "@reduxjs/toolkit";

export const cameraSlice = createSlice({
  name: "livecam",
  initialState: {
    alertOpen: false,
    errors: null,
    loading: false,
    messages: null,
    messagesOpen: false,
    path: null,
    results: null,
  },
  reducers: {
    add: (state, action) => {
      state.errors = null
      state.loading = false
      state.results = state.results ? [...state.results, action.payload].sort((a, b) =>
          a.name > b.name ? 1 : -1
      ) : [action.payload]
      state.messages = [`"${action.payload.name}" created successfully!`]
    },
    set: (state, action) => {
      state.errors = null
      state.loading = false
      state.path = action.payload.path;
      state.results = action.payload.results;
    },
    setAlertOpen: (state, action) => {
      state.alertOpen = action.payload
    },
    setMessagesOpen: (state, action) => {
      state.messagesOpen = action.payload
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    setLoading: (state, action) => {state.loading = action.payload},
    upload: (state, action) => {
      state.errors = action.payload.errors
      state.loading = false
      state.messages = [action.payload.messages]
    },
  },
});

export const { add, set, setAlertOpen, setErrors, setLoading, setMessagesOpen, upload } =
  cameraSlice.actions;

export default cameraSlice.reducer;

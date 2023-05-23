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
  },
});

export const { set, setAlertOpen, setErrors, setLoading, setMessagesOpen, upload } =
  cameraSlice.actions;

export default cameraSlice.reducer;

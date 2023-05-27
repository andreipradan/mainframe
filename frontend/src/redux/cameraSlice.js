import { createSlice } from "@reduxjs/toolkit";

export const cameraSlice = createSlice({
  name: "livecam",
  initialState: {
    alertOpen: false,
    errors: null,
    loading: false,
    loadingFiles: null,
    messages: null,
    messagesOpen: false,
    path: null,
    results: null,
  },
  reducers: {
    download: (state, action) => {
      state.errors = null
      state.loading = false
      state.loadingFiles = state.loadingFiles.filter(file => file !== action.payload.filename)
      state.path = action.payload.data.path;
      state.results = action.payload.data.results;
    },
    set: (state, action) => {
      state.errors = null
      state.loading = false
      state.loadingFiles = null
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
      state.loadingFiles = null;
    },
    setLoading: (state, action) => {state.loading = action.payload},
    setLoadingFiles: (state, action) => {
      state.loadingFiles =
        !state.loadingFiles
          ? [action.payload]
          : [...state.loadingFiles, action.payload];

    }
  },
});

export const { download, set, setAlertOpen, setErrors, setLoading, setLoadingFiles, setMessagesOpen, upload } =
  cameraSlice.actions;

export default cameraSlice.reducer;

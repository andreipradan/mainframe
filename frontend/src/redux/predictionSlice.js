import { createSlice } from "@reduxjs/toolkit";

export const predictionSlice = createSlice({
  name: "prediction",
  initialState: {
    errors: null,
    loading: false,
    loadingPredict: null,
    loadingTrain: null,
    predict: null,
    train: null,
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
      state.loadingPredict = false
      state.loadingTrain = false
      state.predict = action.payload.predict;
      state.train = action.payload.train;
    },
    setLoading: (state, action) => {state.loading = action.payload},
    setLoadingTask: (state, action) => {
      if (action.payload.type === "train")
        state.loadingTrain = action.payload.loading
      else if (action.payload.type === "predict")
        state.loadingPredict = action.payload.loading
      else console.log("Invalid loading task type: " + action.payload.type)
    },
    setPredictTask: (state, action) => {
      state.errors = null
      state.loading = false
      state.loadingPredict = false
      state.predict = action.payload
    },
    setTask: (state, action) => {
      state.errors = null
      state.loading = false
      if (action.payload.type === "train") {
        if (action.payload.updateLoading)
          state.loadingTrain = false
        state.train = action.payload.data
      } else if (action.payload.type === "predict") {
        if (action.payload.updateLoading)
          state.loadingPredict = false
        state.predict = action.payload.data
      }
      else console.log("Invalid loading task type: " + action.payload.type)
    },
  },
});

export const {
  set,
  setErrors,
  setLoading,
  setLoadingTask,
  setTask,
} = predictionSlice.actions;
export default predictionSlice.reducer;

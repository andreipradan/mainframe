import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../redux/authSlice";
import botReducer from "../redux/botsSlice";
import earthquakesReducer from "../redux/earthquakesSlice"
import lightsReducer from "../redux/lightsSlice";
import logsReducer from "../redux/logsSlice";

export default configureStore({
  reducer: {
    auth: authReducer,
    bots: botReducer,
    earthquakes: earthquakesReducer,
    lights: lightsReducer,
    logs: logsReducer,
  },
});

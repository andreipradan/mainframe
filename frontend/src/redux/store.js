import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../redux/authSlice";
import botReducer from "../redux/botsSlice";
import lightsReducer from "../redux/lightsSlice";

export default configureStore({
  reducer: {
    auth: authReducer,
    bots: botReducer,
    lights: lightsReducer,
  },
});

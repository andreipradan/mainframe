import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../redux/authSlice";
import botReducer from "../redux/botsSlice";

export default configureStore({
  reducer: {
    auth: authReducer,
    bots: botReducer,
  },
});

import { configureStore } from "@reduxjs/toolkit";
import botReducer from "../redux/botsSlice";

export default configureStore({
  reducer: {
    bots: botReducer,
  },
});

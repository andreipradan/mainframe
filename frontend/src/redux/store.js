import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../redux/authSlice";
import botReducer from "../redux/botsSlice";
import cameraReducer from "./cameraSlice";
import creditReducer from "../redux/creditSlice";
import cronsReducer from "../redux/cronsSlice"
import devicesReducer from "../redux/devicesSlice"
import earthquakesReducer from "../redux/earthquakesSlice"
import lightsReducer from "../redux/lightsSlice";
import logsReducer from "../redux/logsSlice";
import mealsReducer from "../redux/mealsSlice";
import rpiReducer from "../redux/rpiSlice";
import transactionsReducer from "../redux/transactionsSlice";

export default configureStore({
  reducer: {
    auth: authReducer,
    bots: botReducer,
    camera: cameraReducer,
    credit: creditReducer,
    crons: cronsReducer,
    devices: devicesReducer,
    earthquakes: earthquakesReducer,
    lights: lightsReducer,
    logs: logsReducer,
    meals: mealsReducer,
    rpi: rpiReducer,
    transactions: transactionsReducer,
  },
});

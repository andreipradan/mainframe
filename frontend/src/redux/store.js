import { configureStore } from "@reduxjs/toolkit";
import accountsReducer from "../redux/accountsSlice";
import authReducer from "../redux/authSlice";
import botReducer from "../redux/botsSlice";
import cameraReducer from "./cameraSlice";
import categoriesReducer from "./categoriesSlice";
import creditReducer from "../redux/creditSlice"
import cronsReducer from "../redux/cronsSlice"
import devicesReducer from "../redux/devicesSlice"
import expensesReducer from "../redux/expensesSlice"
import exchangeReducer from "../redux/exchangeSlice"
import earthquakesReducer from "../redux/earthquakesSlice"
import groupsReducer from "../redux/groupsSlice"
import lightsReducer from "../redux/lightsSlice";
import logsReducer from "../redux/logsSlice";
import mealsReducer from "../redux/mealsSlice";
import paymentReducer from "../redux/paymentSlice";
import predictionReducer from "./predictionSlice";
import rpiReducer from "../redux/rpiSlice";
import timetableReducer from "./timetableSlice";
import transactionsReducer from "../redux/transactionsSlice";
import usersSlice from "../redux/usersSlice";

export default configureStore({
  reducer: {
    accounts: accountsReducer,
    auth: authReducer,
    bots: botReducer,
    camera: cameraReducer,
    categories: categoriesReducer,
    credit: creditReducer,
    crons: cronsReducer,
    devices: devicesReducer,
    exchange: exchangeReducer,
    expenses: expensesReducer,
    earthquakes: earthquakesReducer,
    groups: groupsReducer,
    lights: lightsReducer,
    logs: logsReducer,
    meals: mealsReducer,
    payment: paymentReducer,
    prediction: predictionReducer,
    rpi: rpiReducer,
    timetable: timetableReducer,
    transactions: transactionsReducer,
    users: usersSlice,
  },
});

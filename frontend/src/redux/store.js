import { configureStore } from "@reduxjs/toolkit";
import accountsReducer from "../redux/accountsSlice";
import authReducer from "../redux/authSlice";
import botReducer from "../redux/botsSlice";
import categoriesReducer from "./categoriesSlice";
import creditReducer from "../redux/creditSlice"
import commandsReducer from "../redux/commandsSlice"
import cronsReducer from "../redux/cronsSlice"
import cryptoReducer from "../redux/cryptoSlice"
import devicesReducer from "../redux/devicesSlice"
import expensesReducer from "../redux/expensesSlice"
import exchangeReducer from "../redux/exchangeSlice"
import earthquakesReducer from "../redux/earthquakesSlice"
import groupsReducer from "../redux/groupsSlice"
import lightsReducer from "../redux/lightsSlice";
import logsReducer from "../redux/logsSlice";
import mealsReducer from "../redux/mealsSlice";
import messagesReducer from "../redux/messagesSlice";
import paymentReducer from "../redux/paymentSlice";
import pnlReducer from "../redux/pnlSlice";
import predictionReducer from "./predictionSlice";
import rpiReducer from "../redux/rpiSlice";
import stocksReducer from "./stocksSlice";
import sourcesReducer from "./sourcesSlice";
import tasksReducer from "./tasksSlice";
import timetableReducer from "./timetableSlice";
import transactionsReducer from "../redux/transactionsSlice";
import usersSlice from "../redux/usersSlice";
import watchersSlice from "../redux/watchersSlice";

export default configureStore({
  reducer: {
    accounts: accountsReducer,
    auth: authReducer,
    bots: botReducer,
    categories: categoriesReducer,
    commands: commandsReducer,
    credit: creditReducer,
    crons: cronsReducer,
    crypto: cryptoReducer,
    devices: devicesReducer,
    exchange: exchangeReducer,
    expenses: expensesReducer,
    earthquakes: earthquakesReducer,
    groups: groupsReducer,
    lights: lightsReducer,
    logs: logsReducer,
    meals: mealsReducer,
    messages: messagesReducer,
    payment: paymentReducer,
    pnl: pnlReducer,
    prediction: predictionReducer,
    rpi: rpiReducer,
    sources: sourcesReducer,
    stocks: stocksReducer,
    tasks: tasksReducer,
    timetable: timetableReducer,
    transactions: transactionsReducer,
    users: usersSlice,
    watchers: watchersSlice,
  },
});

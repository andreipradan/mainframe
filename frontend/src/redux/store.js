import { configureStore } from '@reduxjs/toolkit';
import activityReducer from './activitySlice';
import accountsReducer from './accountsSlice';
import authReducer from './authSlice';
import bondsReducer from './bondsSlice';
import botReducer from './botsSlice';
import carReducer from './carSlice';
import categoriesReducer from './categoriesSlice';
import creditReducer from './creditSlice';
import commandsReducer from './commandsSlice';
import cronsReducer from './cronsSlice';
import cryptoReducer from './cryptoSlice';
import cryptoPnlReducer from './cryptoPnlSlice';
import depositsReducer from './depositsSlice';
import devicesReducer from './devicesSlice';
import expensesReducer from './expensesSlice';
import exchangeReducer from './exchangeSlice';
import earthquakesReducer from './earthquakesSlice';
import eventsReducer from './eventsSlice';
import favoritesReducer from './favoritesSlice';
import groupsReducer from './groupsSlice';
import investmentsReducer from './investmentsSlice';
import lightsReducer from './lightsSlice';
import logsReducer from './logsSlice';
import mealsReducer from './mealsSlice';
import messagesReducer from './messagesSlice';
import paymentReducer from './paymentSlice';
import pensionReducer from './pensionSlice';
import pnlReducer from './pnlSlice';
import predictionReducer from './predictionSlice';
import rpiReducer from './rpiSlice';
import stocksReducer from './stocksSlice';
import sourcesReducer from './sourcesSlice';
import tasksReducer from './tasksSlice';
import timetableReducer from './timetableSlice';
import transactionsReducer from './transactionsSlice';
import transitSlice from './transitSlice';
import usersSlice from './usersSlice';
import watchersSlice from './watchersSlice';

export default configureStore({
  reducer: {
    accounts: accountsReducer,
    activity: activityReducer,
    auth: authReducer,
    bots: botReducer,
    car: carReducer,
    categories: categoriesReducer,
    commands: commandsReducer,
    credit: creditReducer,
    crons: cronsReducer,
    crypto: cryptoReducer,
    bonds: bondsReducer,
    cryptoPnl: cryptoPnlReducer,
    deposits: depositsReducer,
    devices: devicesReducer,
    exchange: exchangeReducer,
    expenses: expensesReducer,
    earthquakes: earthquakesReducer,
    events: eventsReducer,
    favorites: favoritesReducer,
    investments: investmentsReducer,
    groups: groupsReducer,
    lights: lightsReducer,
    logs: logsReducer,
    meals: mealsReducer,
    messages: messagesReducer,
    payment: paymentReducer,
    pension: pensionReducer,
    pnl: pnlReducer,
    prediction: predictionReducer,
    rpi: rpiReducer,
    sources: sourcesReducer,
    stocks: stocksReducer,
    tasks: tasksReducer,
    timetable: timetableReducer,
    transactions: transactionsReducer,
    transit: transitSlice,
    users: usersSlice,
    watchers: watchersSlice,
  },
});

import { createSlice } from "@reduxjs/toolkit";

export const botsSlice = createSlice({
  name: "bots",
  initialState: {
    editorOpen: false,
    errors: null,
    list: null,
    loadingBots: null,
    selectedBot: null,
  },
  reducers: {
    add: (state, action) => {
      state.list = state.list ? [...state.list, action.payload] : [action.payload];
      state.errors = null;
    },
    remove: (state, action) => {
      state.list = state.list.filter((bot) => bot.id !== action.payload);
      state.errors = null;
    },
    setEditorOpen: (state, action) => {
      state.editorOpen = action.payload;
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
    },
    select: (state, action) => {
      state.selectedBot = action.payload;
    },
    set: (state, action) => {
      state.list = action.payload;
      state.errors = null;
    },
    setLoading: (state, action) => {
      state.loadingBots = !state.loadingBots
        ? [action.payload]
        : [...state.loadingBots, action.payload];
    },
    update: (state, action) => {
      state.list = state.list.map((bot) => (bot.id === action.payload.id ? action.payload : bot));
      state.errors = null;
      state.loadingBots = state.loadingBots.filter((bot) => bot.id === action.payload.id);
    },
  },
});

export const { add, remove, select, set, setErrors, setLoading, update } = botsSlice.actions;

export default botsSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";

export const botsSlice = createSlice({
  name: "bots",
  initialState: {
    editorOpen: false,
    errors: null,
    list: null,
    loading: false,
    loadingBots: null,
    selectedBot: null,
  },
  reducers: {
    add: (state, action) => {
      state.list = state.list ? [...state.list, action.payload] : [action.payload];
      state.errors = null;
      state.loading = false;
    },
    remove: (state, action) => {
      state.list = state.list.filter((bot) => bot.id !== action.payload);
      state.errors = null;
    },
    select: (state, action) => {
      state.selectedBot = action.payload ? state.list.find(bot => bot.id === action.payload) : null
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
      state.loadingBots = null;
    },
    set: (state, action) => {
      state.list = action.payload;
      state.errors = null;
      state.loading = false;
    },
    setLoading: (state, action) => {
      state.list = null;
      state.loading = action.payload;
    },
    setLoadingBots: (state, action) => {
      state.loadingBots = !state.loadingBots
        ? [action.payload]
        : [...state.loadingBots, action.payload];
    },
    update: (state, action) => {
      state.list = state.list.map((bot) => (bot.id === action.payload.id ? action.payload : bot));
      state.errors = null;
      state.loadingBots = state.loadingBots?.filter((bot) => bot.id === action.payload.id);
    },
  },
});

export const { add, remove, select, set, setErrors, setLoading, setLoadingBots, update } =
  botsSlice.actions;

export default botsSlice.reducer;

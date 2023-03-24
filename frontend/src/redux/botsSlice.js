import { createSlice } from "@reduxjs/toolkit";

export const botsSlice = createSlice({
  name: "bots",
  initialState: {
    count: 0,
    editorOpen: false,
    errors: null,
    loading: false,
    loadingBots: null,
    next: null,
    previous: null,
    results: null,
    selectedBot: null,
  },
  reducers: {
    add: (state, action) => {
      state.count += 1
      state.errors = null
      state.loading = false
      state.results = state.results ? [...state.results, action.payload] : [action.payload]
    },
    remove: (state, action) => {
      state.count -= 1
      state.errors = null
      state.results = state.results.filter((bot) => bot.id !== action.payload)
    },
    select: (state, action) => {
      state.selectedBot = action.payload ? state.results.find(bot => bot.id === action.payload) : null
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
      state.loadingBots = null;
    },
    set: (state, action) => {
      state.count = action.payload.count
      state.errors = null
      state.loading = false
      state.loadingBots = null
      state.next = action.payload.next
      state.previous = action.payload.previous
      state.results = action.payload.results
    },
    setLoading: (state, action) => {state.loading = action.payload},
    setLoadingBots: (state, action) => {
      state.loadingBots = !state.loadingBots
        ? [action.payload]
        : [...state.loadingBots, action.payload];
    },
    update: (state, action) => {
      state.errors = null;
      state.loadingBots = state.loadingBots?.filter((bot) => bot.id === action.payload.id);
      state.results = state.results.map((bot) => (bot.id === action.payload.id ? action.payload : bot));
      state.selectedBot = action.payload.id === state.selectedBot.id ? action.payload : state.selectedBot
    },
  },
});

export const { add, remove, select, set, setErrors, setLoading, setLoadingBots, update } =
  botsSlice.actions;

export default botsSlice.reducer;

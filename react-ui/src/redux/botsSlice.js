import { createSlice } from "@reduxjs/toolkit";

export const botsSlice = createSlice({
  name: "bots",
  initialState: { editorOpen: false, errors: null, list: null, selectedBot: null },
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
    update: (state, action) => {
      state.list = state.list.map((bot) =>
        bot.id === action.payload.botId ? action.payload.data : bot
      );
      state.errors = null;
    },
  },
});

export const { add, remove, select, set, setErrors, update } = botsSlice.actions;

export default botsSlice.reducer;

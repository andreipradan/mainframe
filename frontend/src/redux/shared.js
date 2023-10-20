export const getBaseSliceOptions = (name, extraInitialState={}, extraReducers={}) => ({
  name: name,
  initialState: {
    count: 0,
    errors: null,
    kwargs: {},
    loading: false,
    loadingItems: null,
    next: null,
    previous: null,
    results: null,
    selectedItem: null,
    ...extraInitialState
  },
  reducers: {
    create: (state, action) => {
      state.count += 1
      state.errors = null
      state.loading = false
      state.results = state.results
          ? [...state.results, action.payload].sort((a, b) =>
              a.name > b.name ? 1 : -1
          )
          : [action.payload]
    },
    deleteItem: (state, action) => {
      state.count -= 1
      state.errors = null
      state.loading = false
      state.loadingItems = state.loadingItems
        ? state.loadingItems.filter(id => id !== action.payload)
        : null
      state.results = state.results.filter((t) => t.id !== action.payload)
      state.selectedItem = null
    },
    selectItem: (state, action) => {
      state.selectedItem = action.payload
        ? state.results.find(t => t.id === action.payload)
        : null
    },
    setErrors: (state, action) => {
      state.errors = action.payload
      state.loading = false
      state.loadingItems = null
    },
    set: (state, action) => {
      state.errors = null
      state.loading = false
      state.loadingItems = null
      for (const key of Object.keys(action.payload))
        state[key] = action.payload[key]
    },
    setKwargs: (state, action) => {state.kwargs = action.payload},
    setLoading: (state, action) => {state.loading = action.payload},
    setLoadingItems: (state, action) => {
      state.loadingItems = !state.loadingItems
        ? [action.payload]
        : [...state.loadingItems, action.payload];
    },
    update: (state, action) => {
      state.errors = null;
      state.loading = false
      state.loadingItems = state.loadingItems?.filter((id) => id !== action.payload.id);
      state.results = state.results.map((item) =>
        (item.id === action.payload.id ? action.payload : item))
      state.selectedItem = null
    },
    ...extraReducers,
  },
})

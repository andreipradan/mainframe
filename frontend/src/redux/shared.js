export const getBaseSliceOptions = (name, extraInitialState={}, extraReducers={}) => ({
  name,
  initialState: {
    count: 0,
    errors: null,
    extra: null,
    kwargs: {},
    loading: false,
    loadingItems: null,
    modalOpen: false,
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
      state.modalOpen = false
      state.results = state.results
        ? state.results[0].date
          ? [...state.results, action.payload].sort((a,b) => a.date < b.date ? 1 : -1)
          : [...state.results, action.payload].sort((a, b) =>
              a.name > b.name
                ? 1
                : a.id > b.id ? 1 : -1
        )
        : [action.payload]
      state.selectedItem =
        action.payload.dontClearSelectedItem === true
          ? state.selectedItem
          : action.payload.setSelected === true
            ? state.results.find(item => item.id === action.payload.id)
            : null
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
    setExtra: (state, action) => {
      const extra = state.extra || {}
      for (const key of Object.keys(action.payload))
        extra[key] = action.payload[key]
      state.extra = extra
    },
    selectItem: (state, action) => {
      state.selectedItem = action.payload
        ? state.results.find(t => t.id === action.payload)
        : null
    },
    setCompletedLoadingItem: (state, action) => {
      state.loadingItems = state.loadingItems
        ? state.loadingItems.filter(i => i !== action.payload)
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
    setKwargs: (state, action) => {
      state.kwargs = state.kwargs
        ? {...state.kwargs, ...action.payload}
        : action.payload
    },
    setItem: (state, action) => {
      state.errors = null
      state.loading = false
      state.loadingItems = state.loadingItems
        ? state.loadingItems.filter(i => i !== action.payload.id)
        : null
      state.results = state.results.map(r => r.id !== action.payload.id ? r : action.payload)
      state.selectedItem = action.payload
    },
    setLoading: (state, action) => {state.loading = action.payload !== undefined ? action.payload : true},
    setLoadingItems: (state, action) => {
      state.loadingItems = !state.loadingItems
        ? [action.payload]
        : [...new Set([...state.loadingItems, action.payload])];
    },
    setModalOpen: (state, action) => {state.modalOpen = action.payload},
    update: (state, action) => {
      state.errors = null
      state.loading = false
      state.loadingItems = state.loadingItems?.filter(id => id !== action.payload.id);
      state.results = state.results.map(item => item.id === action.payload.id ? action.payload : item)
      state.selectedItem =
        action.payload.dontClearSelectedItem === true
          ? state.selectedItem
          : action.payload.setSelected === true
            ? state.results.find(item => item.id === action.payload.id)
            : null
    },
    ...extraReducers,
  },
})

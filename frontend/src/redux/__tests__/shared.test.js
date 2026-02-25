import { getBaseSliceOptions } from '../shared';

describe('redux/shared getBaseSliceOptions reducers', () => {
  test('create reducer adds item and sorts by ordering', () => {
    const opts = getBaseSliceOptions('test');
    const state = JSON.parse(JSON.stringify(opts.initialState));
    state.results = [
      { id: 'a', date: '2020-01-01', name: 'Alpha' },
      { id: 'b', date: '2021-01-01', name: 'Beta' },
    ];
    state.count = 2;

    // add a new item with later date -> should become first (ordering: -date,name)
    opts.reducers.create(state, { payload: { id: 'c', date: '2022-01-01', name: 'Charlie' } });
    expect(state.count).toBe(3);
    expect(state.results[0].id).toBe('c');
  });

  test('setExtra merges extra fields', () => {
    const opts = getBaseSliceOptions('test');
    const state = JSON.parse(JSON.stringify(opts.initialState));
    opts.reducers.setExtra(state, { payload: { a: 1 } });
    expect(state.extra).toEqual({ a: 1 });
    opts.reducers.setExtra(state, { payload: { b: 2 } });
    expect(state.extra).toEqual({ a: 1, b: 2 });
  });

  test('selectItem sets and clears selectedItem', () => {
    const opts = getBaseSliceOptions('test');
    const state = JSON.parse(JSON.stringify(opts.initialState));
    state.results = [{ id: 1 }, { id: 2 }];
    opts.reducers.selectItem(state, { payload: 2 });
    expect(state.selectedItem).toEqual({ id: 2 });
    opts.reducers.selectItem(state, { payload: null });
    expect(state.selectedItem).toBeNull();
  });

  test('deleteItem removes item and updates loadingItems', () => {
    const opts = getBaseSliceOptions('test');
    const state = JSON.parse(JSON.stringify(opts.initialState));
    state.results = [{ id: 'a' }, { id: 'b' }];
    state.count = 2;
    state.loadingItems = ['a', 'x'];

    opts.reducers.deleteItem(state, { payload: 'a' });
    expect(state.count).toBe(1);
    expect(state.results.find(r => r.id === 'a')).toBeUndefined();
    expect(state.loadingItems).toEqual(['x']);
    expect(state.selectedItem).toBeNull();
  });

  test('setKwargs merges kwargs and setLoadingItems toggles', () => {
    const opts = getBaseSliceOptions('test');
    const state = JSON.parse(JSON.stringify(opts.initialState));
    opts.reducers.setKwargs(state, { payload: { a: 1 } });
    expect(state.kwargs).toEqual({ a: 1 });
    opts.reducers.setKwargs(state, { payload: { b: 2 } });
    expect(state.kwargs).toEqual({ a: 1, b: 2 });

    opts.reducers.setLoadingItems(state, { payload: 'id1' });
    expect(state.loadingItems).toEqual(['id1']);
    opts.reducers.setLoadingItems(state, { payload: 'id2' });
    expect(new Set(state.loadingItems)).toEqual(new Set(['id1', 'id2']));
  });

  test('setOnly and update modify state and selection behavior', () => {
    const opts = getBaseSliceOptions('test');
    const state = JSON.parse(JSON.stringify(opts.initialState));
    state.results = [{ id: 1, name: 'old' }];
    state.count = 1;

    opts.reducers.setOnly(state, { payload: { extra: 5 } });
    expect(state.extra).toBe(5);

    // update existing item
    opts.reducers.update(state, { payload: { id: 1, name: 'new', setSelected: true } });
    expect(state.results.find(r => r.id === 1).name).toBe('new');
    expect(state.selectedItem).toEqual(state.results.find(r => r.id === 1));
  });

  test('setErrors and setItem behave as expected', () => {
    const opts = getBaseSliceOptions('test');
    const state = JSON.parse(JSON.stringify(opts.initialState));
    state.results = [{ id: 10, value: 1 }];
    state.loading = true;
    state.loadingItems = ['x'];

    opts.reducers.setErrors(state, { payload: { msg: 'err' } });
    expect(state.errors).toEqual({ msg: 'err' });
    expect(state.loading).toBe(false);
    expect(state.loadingItems).toBeNull();

    opts.reducers.setLoading(state, { payload: true });
    expect(state.loading).toBe(true);

    opts.reducers.setItem(state, { payload: { id: 10, value: 2 } });
    expect(state.results.find(r => r.id === 10).value).toBe(2);
    expect(state.selectedItem).toEqual({ id: 10, value: 2 });

    opts.reducers.setModalOpen(state, { payload: true });
    expect(state.modalOpen).toBe(true);
  });

  test('create reducer preserves selectedItem when dontClearSelectedItem is true', () => {
    const opts = getBaseSliceOptions('test');
    const state = JSON.parse(JSON.stringify(opts.initialState));
    state.results = [{ id: 1 }, { id: 2 }];
    state.selectedItem = { id: 1 };

    opts.reducers.create(state, { payload: { id: 3, dontClearSelectedItem: true } });
    expect(state.selectedItem).toEqual({ id: 1 });
  });

  test('create reducer sets selectedItem when setSelected is true', () => {
    const opts = getBaseSliceOptions('test');
    const state = JSON.parse(JSON.stringify(opts.initialState));
    state.results = [{ id: 1 }, { id: 2 }];
    state.count = 2;

    opts.reducers.create(state, { payload: { id: 3, setSelected: true } });
    expect(state.count).toBe(3);
    expect(state.selectedItem).toEqual(state.results.find(r => r.id === 3));
  });

  test('update reducer preserves selection with dontClearSelectedItem and removes loadingItems', () => {
    const opts = getBaseSliceOptions('test');
    const state = JSON.parse(JSON.stringify(opts.initialState));
    state.results = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
    state.selectedItem = { id: 1, name: 'a' };
    state.loadingItems = [2, 1];

    opts.reducers.update(state, { payload: { id: 1, name: 'updated', dontClearSelectedItem: true } });
    expect(state.selectedItem).toEqual({ id: 1, name: 'a' });
    expect(state.loadingItems).toEqual([2]);
  });

  test('setItem removes id from loadingItems', () => {
    const opts = getBaseSliceOptions('test');
    const state = JSON.parse(JSON.stringify(opts.initialState));
    state.results = [{ id: 10, value: 1 }];
    state.loadingItems = [10, 'x'];

    opts.reducers.setItem(state, { payload: { id: 10, value: 2 } });
    expect(state.results.find(r => r.id === 10).value).toBe(2);
    expect(state.loadingItems).toEqual(['x']);
  });
});

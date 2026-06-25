import React, { useEffect, useRef } from 'react';
import Form from 'react-bootstrap/Form';
import { useDispatch, useSelector } from 'react-redux';
import { Badge } from 'react-bootstrap';

import { setKwargs } from '../../redux/eventsSlice';
import { setFavoritesFilter } from '../../redux/favoritesSlice';

const FavoriteBandsFilter = () => {
  const dispatch = useDispatch();

  const favorites = useSelector((state) => state.favorites) || {};
  const kwargsFavorites = useSelector(
    (state) => state.events.kwargs?.favorites
  );

  const label = `Only favorite bands (${favorites.results?.length})`;

  const prevFavsRef = useRef(
    JSON.stringify(favorites.results?.map((f) => f.name))
  );

  useEffect(() => {
    if (!favorites.favoritesFilter) {
      prevFavsRef.current = JSON.stringify(
        favorites.results?.map((f) => f.name)
      );
      return;
    }

    const currentFavs = favorites.results?.map((f) => f.name);
    const currentJson = JSON.stringify(currentFavs);

    // Only update kwargs when the favorites array actually changed since
    // last time. This prevents overwriting a one-off selection made by
    // clicking a band in the manager which sets kwargs directly.
    if (prevFavsRef.current !== currentJson) {
      if (currentFavs.length) {
        dispatch(setKwargs({ favorites: currentFavs, page: 1 }));
      } else {
        dispatch(setKwargs({ favorites: undefined, page: 1 }));
      }
      prevFavsRef.current = currentJson;
    }
  }, [favorites.results, favorites.favoritesFilter]);

  const getActiveFavorites = () => {
    if (Array.isArray(kwargsFavorites) && kwargsFavorites.length)
      return kwargsFavorites;
    return (favorites.results || []).map((f) => f.name);
  };

  const removeFromFilter = (name) => {
    const active = getActiveFavorites();
    const next = (active || []).filter((n) => String(n) !== String(name));
    if (next.length) {
      dispatch(setKwargs({ favorites: next, page: 1 }));
    } else {
      dispatch(setKwargs({ favorites: undefined, page: 1 }));
      dispatch(setFavoritesFilter(false));
    }
  };

  return (
    <div className='d-flex align-items-center'>
      <Form.Check
        type='checkbox'
        id='favorites-filter'
        disabled={favorites.results?.length === 0}
        label={label}
        checked={favorites.favoritesFilter}
        onChange={async (e) => {
          const enabled = e.target.checked;
          dispatch(setFavoritesFilter(enabled));
          if (enabled) {
            // If we don't have favorites loaded, fetch them first
            let favsList = favorites.results || [];
            const favs = (favsList || []).map((f) => f.name);
            if (favs.length) dispatch(setKwargs({ favorites: favs, page: 1 }));
            else dispatch(setKwargs({ favorites: undefined, page: 1 }));
          } else {
            dispatch(setKwargs({ favorites: undefined, page: 1 }));
          }
        }}
      />
      <sup>
        <a href='/events/favorites' className='small ml-2'>
          [Manage]
        </a>
      </sup>
      <div className='ml-3'>
        {favorites.favoritesFilter ? (
          <div className='mt-2'>
            {getActiveFavorites().map((name) => (
              <Badge
                key={name}
                className='mr-1'
                style={{ cursor: 'pointer' }}
                role='button'
                aria-label={`Remove ${name} from filter`}
                onClick={() => removeFromFilter(name)}
              >
                {name} &nbsp; ×
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default FavoriteBandsFilter;

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Pagination } from 'react-bootstrap';

const BottomPagination = (props) => {
  const dispatch = useDispatch();
  const kwargs = props.items.kwargs || {};
  const currentPage = !props.items.previous
    ? 1
    : (parseInt(new URL(props.items.previous).searchParams.get('page')) || 1) +
      1;
  const pageSize = props.items.page_size || 10;
  const lastPage = Math.max(1, Math.ceil((props.items.count || 0) / pageSize));

  // responsive number of pages to show around the current page
  const getVisiblePages = () => {
    if (typeof window === 'undefined') return 5;
    const w = window.innerWidth;
    // breakpoints: small mobile, large mobile, tablet, desktop
    if (w < 480) return 1; // very narrow - only show one neighbor on each side
    if (w < 768) return 2; // mobile portrait
    if (w < 1024) return 3; // tablet
    return 5; // desktop
  }

  const [visiblePages, setVisiblePages] = useState(getVisiblePages());
  useEffect(() => {
    const onResize = () => setVisiblePages(getVisiblePages());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const token = useSelector((state) => state.auth.token);
  useEffect(() => {
    if (props.newApi) dispatch(props.fetchMethod(kwargs));
    else dispatch(props.fetchMethod(token, kwargs));
  }, [kwargs]);
  return props.items.count > pageSize ? (
    <Pagination>
      <Pagination.First
        disabled={!props.items.previous}
        onClick={() => dispatch(props.setKwargs({ page: 1 }))}
      />
      <Pagination.Prev
        disabled={!props.items.previous}
        onClick={() => dispatch(props.setKwargs({ page: currentPage - 1 }))}
      />
      {/* build a single ordered list of page numbers to render (avoid duplicates) */}
      {(() => {
        const pages = [];
        // always include first two pages if applicable
        if (1 <= lastPage) pages.push(1);
        if (2 <= lastPage && 2 !== pages[pages.length - 1]) pages.push(2);

        const windowStart = Math.max(3, currentPage - visiblePages);
        const windowEnd = Math.min(lastPage - 2, currentPage + visiblePages);
        for (let p = windowStart; p <= windowEnd; p++) {
          if (p > 2 && p < lastPage - 1) pages.push(p);
        }

        if (lastPage - 1 > 2 && lastPage - 1 !== pages[pages.length - 1]) pages.push(lastPage - 1);
        if (lastPage > 2 && lastPage !== pages[pages.length - 1]) pages.push(lastPage);

        // dedupe and sort
        const uniq = Array.from(new Set(pages)).sort((a, b) => a - b);

        const rendered = [];
        let prev = null;
        uniq.forEach((p, idx) => {
          if (prev !== null && p - prev > 1) {
            rendered.push(<Pagination.Ellipsis key={`e-${idx}`} />);
          }
          rendered.push(
            <Pagination.Item
              key={`p-${p}`}
              active={p === currentPage}
              onClick={() => dispatch(props.setKwargs({ page: p }))}
            >
              {p}
            </Pagination.Item>
          );
          prev = p;
        });
        return rendered;
      })()}
      <Pagination.Next
        disabled={!props.items.next}
        onClick={() => dispatch(props.setKwargs({ page: currentPage + 1 }))}
      />
      <Pagination.Last
        disabled={!props.items.next}
        onClick={() => dispatch(props.setKwargs({ page: lastPage }))}
      />
    </Pagination>
  ) : null;
};
export default BottomPagination;

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Pagination } from "react-bootstrap";

const BottomPagination = props => {
  const dispatch = useDispatch();
  const kwargs = props.items.kwargs || {}
  const currentPage = !props.items.previous
    ? 1
    : (parseInt(new URL(props.items.previous).searchParams.get("page")) || 1) + 1
  const pageSize = props.items.page_size
  const lastPage = Math.ceil(props.items.count / pageSize)
  const token = useSelector((state) => state.auth.token)
  useEffect(() => {
    dispatch(props.fetchMethod(token, kwargs));
  }, [kwargs]);
  return props.items.count > pageSize
    ? <Pagination>
      <Pagination.First
        disabled={!props.items.previous}
        onClick={() => dispatch(props.setKwargs({page: 1}))}
      />
      <Pagination.Prev
        disabled={!props.items.previous}
        onClick={() => dispatch(props.setKwargs({page: currentPage -1}))}
      />
      {
        currentPage > 1 && <Pagination.Item
          disabled={currentPage < 2}
          onClick={() => dispatch(props.setKwargs({page: 1}))}
        >
          1
        </Pagination.Item>
      }
      {
        currentPage > 2 && <Pagination.Item
          disabled={currentPage < 3}
          onClick={() => dispatch(props.setKwargs({page: 2}))}
          linkClassName="bg-transparent"
        >
          2
        </Pagination.Item>
      }
      {
        currentPage - 8 > 0 && <Pagination.Ellipsis />
      }
      {
        Array.from(new Array(5), (x, i) => i + currentPage - 6).filter(i => i + 1 > 2).map(i =>
          <Pagination.Item
            active={i + 1 === currentPage}
            key={i}
            onClick={() => dispatch(props.setKwargs({page: i+1}))}
          >
            {i+1}
          </Pagination.Item>)
      }

      <Pagination.Item active>{currentPage}</Pagination.Item>

      {
        Array.from(new Array(5), (x, i) => i + currentPage).filter(i => i < lastPage).map(i =>
          <Pagination.Item
            active={i + 1 === currentPage}
            key={i}
            onClick={() => dispatch(props.setKwargs({page: i+1}))}
          >
            {i+1}
          </Pagination.Item>)
      }
      {
        currentPage + 7 < lastPage && <Pagination.Ellipsis />
      }
      {
        lastPage - 6 > currentPage && <Pagination.Item
          disabled={currentPage > lastPage - 1}
          onClick={() => dispatch(props.setKwargs({page: lastPage - 1}))}
        >
          {lastPage - 1}
        </Pagination.Item>
      }
      {
        lastPage - 5 > currentPage && <Pagination.Item
          active={lastPage - 1 === currentPage}
          onClick={() => dispatch(props.setKwargs({page: lastPage}))}
        >
          {lastPage}
        </Pagination.Item>
      }
      <Pagination.Next
        disabled={!props.items.next}
        onClick={() => dispatch(props.setKwargs({page: currentPage + 1}))}
      />
      <Pagination.Last
        disabled={!props.items.next}
        onClick={() => dispatch(props.setKwargs({page: lastPage}))}
      />
    </Pagination>
    : null
}
export default BottomPagination
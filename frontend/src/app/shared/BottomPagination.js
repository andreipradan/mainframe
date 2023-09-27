import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Pagination } from "react-bootstrap";

import { FinanceApi } from "../../api/finance";

const BottomPagination = props => {
  const dispatch = useDispatch();
  const kwargs = useSelector(state => state.transactions.kwargs) || {}
  const token = useSelector((state) => state.auth.token)
  const currentPage = !props.transactions.previous
    ? 1
    : (parseInt(new URL(props.transactions.previous).searchParams.get("page")) || 1) + 1
  const lastPage = Math.ceil(props.transactions.count / 25)

  return <Pagination>
    <Pagination.First
      disabled={!props.transactions.previous}
      onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs, page: 1}))}
    />
    <Pagination.Prev
      disabled={!props.transactions.previous}
      onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs, page: currentPage -1}))}
    />
    {
      currentPage > 1 && <Pagination.Item
        disabled={currentPage < 2}
        onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs, page: 1}))}
      >
        1
      </Pagination.Item>
    }
    {
      currentPage > 2 && <Pagination.Item
        disabled={currentPage < 3}
        onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs, page: 2}))}
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
          onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs, page: i+1}))}
        >
          {i+1}
        </Pagination.Item>)
    }

    <Pagination.Item active={true}>{currentPage}</Pagination.Item>

    {
      Array.from(new Array(5), (x, i) => i + currentPage).filter(i => i < lastPage).map(i =>
        <Pagination.Item
          active={i + 1 === currentPage}
          onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs, page: i+1}))}
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
        onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs, page: lastPage - 1}))}
      >
        {lastPage - 1}
      </Pagination.Item>
    }
    {
      lastPage - 5 > currentPage && <Pagination.Item
        active={lastPage - 1 === currentPage}
        onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs, page: lastPage}))}
      >
        {lastPage}
      </Pagination.Item>
    }
    <Pagination.Next
      disabled={!props.transactions.next}
      onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs, page: currentPage + 1}))}
    />
    <Pagination.Last
      disabled={!props.transactions.next}
      onClick={() => dispatch(FinanceApi.getTransactions(token, {...kwargs, page: lastPage}))}
    />
  </Pagination>
}
export default BottomPagination
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Circles } from 'react-loader-spinner';

import Errors from '../shared/Errors';
import { ExpensesApi } from '../../api/expenses';
import { selectItem, setModalOpen } from '../../redux/expensesSlice';
import EditModal from './EditModal';

function ExpenseDebts({ debts }) {
  return debts?.length ? (
    <td>
      <ul className='list-arrow'>
        {debts.map((debt) => (
          <li key={debt.id}>
            {debt.user} - {debt.amount}
          </li>
        ))}
      </ul>
    </td>
  ) : (
    <td>No debts</td>
  );
}

function ExpenseRows({ expenses, onSelectExpense }) {
  return (
    <>
      {expenses.loading && (
        <tr>
          <td colSpan={5}>
            <Circles
              visible
              ariaLabel='ball-triangle-loading'
              wrapperStyle={{
                display: 'block',
                marginLeft: 'auto',
                marginRight: 'auto',
                width: '25%',
              }}
              color='orange'
            />
          </td>
        </tr>
      )}
      {!expenses.loading &&
        expenses.results?.length > 0 &&
        expenses.results.map((expense) => (
          <tr
            key={expense.id}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectExpense(expense.id)}
          >
            <td> {expense.date} </td>
            <td>
              {expense.payer.username}
              <p className='text-small'>({expense.payer.email})</p>
            </td>
            <td> {expense.description} </td>
            <td>
              {' '}
              {expense.currency} {expense.amount}{' '}
            </td>
            <ExpenseDebts debts={expense.debts} />
          </tr>
        ))}
      {!expenses.loading && !expenses.results?.length && (
        <tr>
          <td colSpan={6}>
            <span>No accounts found</span>
          </td>
        </tr>
      )}
    </>
  );
}

function ExpenseTableHeader() {
  return (
    <thead>
      <tr>
        <th> Date </th>
        <th> Payed by </th>
        <th> Description </th>
        <th> Amount </th>
        <th> Debtors </th>
      </tr>
    </thead>
  );
}

function ExpenseRefreshButton({ onClick }) {
  return (
    <button
      type='button'
      className='btn btn-outline-success btn-sm border-0 bg-transparent'
      onClick={onClick}
    >
      <i className='mdi mdi-refresh' />
    </button>
  );
}

function AddExpenseButton({ onClick }) {
  return (
    <button
      type='button'
      className='float-right btn btn-outline-primary btn-rounded btn-icon pl-1'
      onClick={onClick}
    >
      <i className='mdi mdi-plus' />
    </button>
  );
}

function ExpensesTable({ expenses, onSelectExpense }) {
  return (
    <div className='table-responsive'>
      <table className='table table-hover'>
        <ExpenseTableHeader />
        <tbody>
          <ExpenseRows expenses={expenses} onSelectExpense={onSelectExpense} />
        </tbody>
      </table>
    </div>
  );
}

function ExpensesCard({ expenses, onAddExpense, onSelectExpense }) {
  return (
    <div className='card grid-margin'>
      <div className='card-body'>
        <h4 className='card-title'>
          <AddExpenseButton onClick={onAddExpense} />
        </h4>
        <ExpensesTable expenses={expenses} onSelectExpense={onSelectExpense} />
      </div>
    </div>
  );
}

function ExpensesBreadcrumb() {
  return (
    <nav aria-label='breadcrumb'>
      <ol className='breadcrumb'>
        <li className='breadcrumb-item'>
          <a href='!#' onClick={(event) => event.preventDefault()}>
            Expenses
          </a>
        </li>
        <li className='breadcrumb-item active' aria-current='page'>
          My Expenses
        </li>
      </ol>
    </nav>
  );
}

const Accounts = () => {
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token);
  const expenses = useSelector((state) => state.expenses);

  const api = new ExpensesApi(token);

  useEffect(() => {
    !expenses.results?.length && dispatch(api.getList());
  }, []);

  return (
    <div>
      <div className='page-header'>
        <h3 className='page-title'>
          Expenses{' '}
          <ExpenseRefreshButton onClick={() => dispatch(api.getList())} />
        </h3>
        <ExpensesBreadcrumb />
      </div>
      <Errors errors={expenses.errors} />
      <ExpensesCard
        expenses={expenses}
        onAddExpense={() => {
          dispatch(selectItem());
          dispatch(setModalOpen(true));
        }}
        onSelectExpense={(id) => dispatch(selectItem(id))}
      />
      <EditModal />
    </div>
  );
};

export default Accounts;

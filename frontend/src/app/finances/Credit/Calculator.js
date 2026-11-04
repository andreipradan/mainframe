import React, { useEffect, useState } from 'react';
import { Circles } from 'react-loader-spinner';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import Select from 'react-select';

import { calculateSum } from '../utils';
import { selectItem as selectTimetable } from '../../../redux/timetableSlice';
import { selectStyles } from '../Accounts/Categorize/EditModal';
import { TimetableApi } from '../../../api/finance';
import Errors from '../../shared/Errors';

const PMT = (ir, np, pv, fv = 0, type = 0) => {
  if (ir === 0) return -(pv + fv) / np;
  const pvif = Math.pow(1 + ir, np);
  let pmt = (-ir * (pv * pvif + fv)) / (pvif - 1);
  if (type === 1) pmt /= 1 + ir;
  return pmt;
};

/** Collects inputs used to calculate the reduced loan duration. */
const DurationForm = ({
  disabled,
  durationAmount,
  durationMonths,
  durationSaved,
  onDurationAmountChange,
  onDurationMonthsChange,
}) => (
  <form
    className='nav-link mt-2 mt-md-0 search'
    onSubmit={(event) => event.preventDefault()}
  >
    <div className='row'>
      <div className='col-md-4'>
        <input
          disabled={disabled}
          type='search'
          className='form-control bg-transparent'
          placeholder='Amount'
          value={durationAmount}
          onChange={onDurationAmountChange}
        />
      </div>
      <div className='col-md-3'>
        <input
          disabled={disabled}
          type='number'
          className='form-control bg-transparent'
          placeholder='# of months'
          value={durationMonths}
          onChange={onDurationMonthsChange}
        />
      </div>
      <div className='col-md-5 pt-2' style={{ textAlign: 'center' }}>
        Saved: RON {durationSaved}
      </div>
    </div>
  </form>
);

/** Shows alternative amounts for the selected loan duration. */
const DurationSuggestions = ({ amounts, durationMonths }) =>
  amounts ? (
    <div className='text-muted small'>
      Other Amounts:
      <ul>
        {Object.keys(amounts).map((month) => (
          <li
            key={month}
            className={
              parseInt(month) === durationMonths ? 'text-success' : 'text-muted'
            }
          >
            {month} month(s): {amounts[month].toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  ) : null;

/** Collects the target monthly payment and shows its totals. */
const MonthlyPaymentControls = ({
  disabled,
  minimumAmount,
  monthlyAmount,
  monthlyError,
  monthlyOtherAmounts,
  onMonthlyAmountChange,
  totalRate,
}) => (
  <div className='nav-link mt-2 mt-md-0 search'>
    <div className='row'>
      <div className='col-md-4'>
        <input
          className={`form-control bg-transparent ${monthlyError ? 'is-invalid' : ''}`}
          disabled={disabled}
          min={minimumAmount}
          onChange={onMonthlyAmountChange}
          placeholder='Amount'
          step={500}
          type='number'
          value={monthlyAmount}
        />
        <small>{monthlyError}</small>
      </div>
      <div className='col-md-4 pt-2' style={{ textAlign: 'center' }}>
        Maturity in: {Object.keys(monthlyOtherAmounts || {}).length} months
        <br />
        <sub className='text-muted'>
          ({Object.values(monthlyOtherAmounts || {}).length} * {monthlyAmount} ={' '}
          {Object.values(monthlyOtherAmounts || {}).length * monthlyAmount})
        </sub>
      </div>
      <div className='col-md-4 pt-2 text-warning'>
        Total:{' '}
        {Object.values(monthlyOtherAmounts || {}).length * monthlyAmount +
          totalRate}
      </div>
    </div>
  </div>
);

/** Renders the calculated monthly payment summary columns. */
const MonthlySuggestionsHeader = ({
  totalRate,
  totalInterest,
  totalPrincipal,
}) => (
  <thead>
    <tr>
      <th>#</th>
      <th>
        Rate <sup className='text-warning'>{totalRate}</sup>
      </th>
      <th>
        Interest <sup className='text-warning'>{totalInterest}</sup>
      </th>
      <th>
        Principal <sup className='text-warning'>{totalPrincipal}</sup>
      </th>
      <th>Remaining</th>
      <th>Maturity</th>
    </tr>
  </thead>
);

/** Lists the monthly payment schedule alternatives. */
const MonthlySuggestionsTable = ({
  amounts,
  totalRate,
  totalInterest,
  totalPrincipal,
}) =>
  amounts ? (
    <div className='table-responsive'>
      <table className='table'>
        <MonthlySuggestionsHeader
          totalRate={totalRate}
          totalInterest={totalInterest}
          totalPrincipal={totalPrincipal}
        />
        <tbody>
          {Object.keys(amounts).map((month) => (
            <tr key={month}>
              <td>{month}</td>
              <td>{amounts[month].rate}</td>
              <td>{amounts[month].interest}</td>
              <td>{amounts[month].principal}</td>
              <td>{amounts[month].remaining}</td>
              <td>{amounts[month].months}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;

/** Groups the controls and suggestions for reducing loan duration. */
const DurationCard = ({
  disabled,
  durationAmount,
  durationMonths,
  durationOtherAmounts,
  durationSaved,
  onDurationAmountChange,
  onDurationMonthsChange,
}) => (
  <div className='col-sm-6 grid-margin'>
    <div className='card'>
      <div className='card-body'>
        <h6>Reduce duration</h6>
        <DurationForm
          disabled={disabled}
          durationAmount={durationAmount}
          durationMonths={durationMonths}
          durationSaved={durationSaved}
          onDurationAmountChange={onDurationAmountChange}
          onDurationMonthsChange={onDurationMonthsChange}
        />
        <DurationSuggestions
          amounts={durationOtherAmounts}
          durationMonths={durationMonths}
        />
      </div>
    </div>
  </div>
);

/** Groups the controls and results for reducing monthly payments. */
const MonthlyPaymentCard = ({
  disabled,
  minimumAmount,
  monthlyAmount,
  monthlyError,
  monthlyOtherAmounts,
  onMonthlyAmountChange,
  totalInterest,
  totalPrincipal,
  totalRate,
}) => (
  <div className='col-sm-6 grid-margin'>
    <div className='card'>
      <div className='card-body'>
        <h6>Reduce monthly payment</h6>
        <MonthlyPaymentControls
          disabled={disabled}
          minimumAmount={minimumAmount}
          monthlyAmount={monthlyAmount}
          monthlyError={monthlyError}
          monthlyOtherAmounts={monthlyOtherAmounts}
          onMonthlyAmountChange={onMonthlyAmountChange}
          totalRate={totalRate}
        />
        <MonthlySuggestionsTable
          amounts={monthlyOtherAmounts}
          totalRate={totalRate}
          totalInterest={totalInterest}
          totalPrincipal={totalPrincipal}
        />
      </div>
    </div>
  </div>
);

/** Renders the calculator title, refresh control, and breadcrumb links. */
const CalculatorPageHeader = ({ loading, onRefresh, onNavigateToCredit }) => (
  <div className='page-header mb-0'>
    <h3 className='page-title'>
      Prepayment calculator
      {loading ? (
        <Circles
          height={20}
          width={20}
          wrapperStyle={{ display: 'default' }}
          wrapperClass='btn'
        />
      ) : (
        <button
          type='button'
          className='btn btn-outline-success btn-sm border-0 bg-transparent'
          onClick={onRefresh}
        >
          <i className='mdi mdi-refresh' />
        </button>
      )}
    </h3>
    <nav aria-label='breadcrumb'>
      <ol className='breadcrumb'>
        <li className='breadcrumb-item'>
          <a href='!#' onClick={(event) => event.preventDefault()}>
            Finance
          </a>
        </li>
        <li className='breadcrumb-item'>
          <a href='/finances/credit/details' onClick={onNavigateToCredit}>
            Credit
          </a>
        </li>
        <li className='breadcrumb-item active' aria-current='page'>
          Calculator
        </li>
      </ol>
    </nav>
  </div>
);

const Calculator = () => {
  const history = useHistory();
  const dispatch = useDispatch();

  const token = useSelector((state) => state.auth.token);
  const timetable = useSelector((state) => state.timetable);

  const timetableApi = new TimetableApi(token);

  useEffect(() => {
    !timetable.selectedItem && dispatch(timetableApi.getList());
  }, [timetable.selectedItem]);
  useEffect(() => {
    !timetable.selectedItem &&
      timetable.results?.length &&
      dispatch(selectTimetable(timetable.results[0].id));
  }, [timetable.results]);

  const latestTimetable = timetable.selectedItem?.amortization_table;
  const currency = timetable.selectedItem?.credit?.currency;

  const [durationAmount, setDurationAmount] = useState(6000);
  const [durationMonths, setDurationMonths] = useState(0);
  const [durationSaved, setDurationSaved] = useState(0);
  const [durationOtherAmounts, setDurationOtherAmounts] = useState(null);

  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [monthlyError, setMonthlyError] = useState('');
  const [monthlyOtherAmounts, setMonthlyOtherAmounts] = useState(null);

  const [totalRate, setTotalRate] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalPrincipal, setTotalPrincipal] = useState(0);
  const [totalPrepayment, setTotalPrepayment] = useState(0);

  useEffect(() => {
    if (latestTimetable?.length) {
      updateDurationAmount(6000);
      setMonthlyAmount(
        Math.round((Number.parseFloat(latestTimetable[0].total) + 2500) / 500) *
          500
      );
    }
  }, [latestTimetable]);

  useEffect(() => {
    if (latestTimetable?.length) {
      setMonthlySuggestions();
      setMonthlyError(
        monthlyAmount < latestTimetable[0].total
          ? `Amount must be >= ${latestTimetable[0].total}`
          : ''
      );
    }
  }, [monthlyAmount]);

  const onChangeTimetable = (newValue) => {
    dispatch(selectTimetable(newValue.value));
  };

  const setDurationSuggestions = (index) => {
    const suggestedAmounts = {};
    Array.from(new Array(5), (x, i) => i + index - 2)
      .filter((i) => i > 0)
      .forEach((i) => {
        suggestedAmounts[i] = calculateSum(
          latestTimetable.slice(0, i),
          'principal'
        );
      });
    setDurationOtherAmounts(suggestedAmounts);
    const saved = (
      calculateSum(latestTimetable.slice(0, index), 'interest') +
      calculateSum(latestTimetable.slice(0, index), 'insurance')
    ).toFixed(2);
    setDurationSaved(saved);
  };

  /** Recalculates the duration and suggestions for a target amount. */
  function updateDurationAmount(value) {
    setDurationAmount(value);
    if (!latestTimetable) return;
    let amount = 0;
    let index = 0;
    for (const [i, item] of latestTimetable.entries()) {
      const principal = Number.parseFloat(item.principal);
      if (amount + principal > value) {
        index = i;
        break;
      }
      amount += principal;
    }
    setDurationMonths(index);
    setDurationSuggestions(index);
  }
  /** Recalculates the target amount and suggestions for a month count. */
  const updateDurationMonths = (value) => {
    setDurationMonths(value);
    if (!latestTimetable) return;
    const amount = calculateSum(latestTimetable.slice(0, value), 'principal');
    setDurationAmount(amount);
    setDurationSuggestions(value);
  };

  const setMonthlySuggestions = () => {
    const suggestedAmounts = {};
    const remaining = calculateSum(latestTimetable, 'principal');
    const interest = timetable.selectedItem.interest / 100;
    Array.from(new Array(latestTimetable.length), (x, i) => i)
      .filter((i) => i > 0)
      .forEach((i) => {
        const rem = remaining - monthlyAmount * i;
        const inter = (interest * rem) / 12;
        const remainingMonths = latestTimetable.length - i;
        const newRate = -PMT(interest / 12, remainingMonths + 1, rem);

        if (rem > 0) {
          suggestedAmounts[i] = {
            rate: newRate.toFixed(2),
            interest: inter.toFixed(2),
            principal: (newRate - inter).toFixed(2),
            remaining: rem.toFixed(2),
            months: remainingMonths,
          };
        }
      });
    setMonthlyOtherAmounts(suggestedAmounts);
    setTotalRate(calculateSum(Object.values(suggestedAmounts), 'rate'));
    setTotalInterest(calculateSum(Object.values(suggestedAmounts), 'interest'));
    setTotalPrincipal(
      calculateSum(Object.values(suggestedAmounts), 'principal')
    );
    setTotalPrepayment(Object.values(suggestedAmounts).length * monthlyAmount);
  };

  return (
    <>
      <CalculatorPageHeader
        loading={timetable.loading}
        onRefresh={() => dispatch(timetableApi.getList())}
        onNavigateToCredit={(event) => {
          event.preventDefault();
          history.push('/finances/credit/details');
        }}
      />
      <div className={'page-header'}>
        <h6 className={'page-title'}>
          {timetable.selectedItem ? (
            <small className='text-muted'>
              Timetable:{' '}
              {timetable.selectedItem.id === timetable.results[0].id
                ? `${timetable.selectedItem.date} (latest)`
                : timetable.selectedItem.date}
              <br />
              Interest: {timetable.selectedItem.interest}%&nbsp; (ircc:{' '}
              {timetable.selectedItem.ircc}%)
              <br />
              Remaining: {calculateSum(latestTimetable, 'principal')}{' '}
              {currency ? currency : null}
              <br />
              Months: {latestTimetable.length}
              <br />
              Next payment: {latestTimetable[0].total} (p:{' '}
              {latestTimetable[0].principal}, i: {latestTimetable[0].interest})
            </small>
          ) : null}
        </h6>
        {timetable.selectedItem ? (
          <Select
            placeholder={'Timetable'}
            value={{
              label: `${timetable.selectedItem.id === timetable.results[0].id ? `${timetable.selectedItem.date} (latest)` : timetable.selectedItem.date}`,
              value: timetable.selectedItem.id,
            }}
            onChange={onChangeTimetable}
            options={timetable.results.map((t, i) => ({
              label: `${i === 0 ? `${t.date} (latest)` : t.date}`,
              value: t.id,
            }))}
            styles={selectStyles}
            closeMenuOnSelect
          />
        ) : null}
      </div>
      <Errors errors={timetable.errors} />
      <div className='row'>
        <DurationCard
          disabled={!latestTimetable || timetable.loading}
          durationAmount={durationAmount}
          durationMonths={durationMonths}
          durationOtherAmounts={durationOtherAmounts}
          durationSaved={durationSaved}
          onDurationAmountChange={(event) =>
            updateDurationAmount(Number.parseFloat(event.target.value) || 0)
          }
          onDurationMonthsChange={(event) =>
            updateDurationMonths(parseInt(event.target.value) || 0)
          }
        />
        <MonthlyPaymentCard
          disabled={!latestTimetable || timetable.loading}
          minimumAmount={
            Math.round(
              (Number.parseFloat(latestTimetable?.[0].total) + 2500) / 500
            ) * 500
          }
          monthlyAmount={monthlyAmount}
          monthlyError={monthlyError}
          monthlyOtherAmounts={monthlyOtherAmounts}
          onMonthlyAmountChange={(event) =>
            setMonthlyAmount(Number.parseFloat(event.target.value) || 0)
          }
          totalInterest={totalInterest}
          totalPrincipal={totalPrincipal}
          totalRate={totalRate}
        />
      </div>
    </>
  );
};

export default Calculator;

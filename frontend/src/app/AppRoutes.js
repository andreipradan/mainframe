import React, { Suspense, lazy } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';

import Spinner from '../app/shared/Spinner';
import { useSelector } from "react-redux";

const Dashboard = lazy(() => import('./dashboard/Dashboard'));
const Bots = lazy(() => import('./bots/Bots'));
const Commands = lazy(() => import('./commands/Commands'));
const Crons = lazy(() => import('./commands/Crons'));
const Devices = lazy(() => import('./devices/Devices'));
const Earthquakes = lazy(() => import('./earthquakes/Earthquakes'));
const ExpensesCar = lazy(() => import('./expenses/Car'));
const ExpensesTravel = lazy(() => import('./expenses/Travel'));
const ExpenseTravelGroups = lazy(() => import("./expenses/ExpenseGroups"));
const FinancesAccountsTransactions = lazy(() => import ("./finances/Accounts/Transactions/Transactions"));
const FinancesCategorize = lazy(() => import ("./finances/Accounts/Categorize/Categorize"));
const FinancesCreditDetails = lazy(() => import ("./finances/Credit/Details"));
const FinancesCalculator = lazy(() => import ("./finances/Credit/Calculator"));
const FinancesPayments = lazy(() => import ("./finances/Credit/Payments/Payments"));
const FinancesTimetables = lazy(() => import ("./finances/Credit/Timetables/Timetables"));
const FXRates = lazy(() => import ("./exchange-rates/ExchangeRates"));
const InvestmentsBonds = lazy(() => import ("./finances/Investments/Bonds"));
const InvestmentsCrypto = lazy(() => import('./finances/Investments/Crypto'));
const InvestmentsDeposits = lazy(() => import ("./finances/Investments/Deposits"));
const InvestmentsPension = lazy(() => import ("./finances/Investments/Pension"));
const InvestmentsStocks = lazy(() => import ("./finances/Investments/Stocks"));
const InvestmentsSummary = lazy(() => import('./finances/Investments/Summary'));
const Logs = lazy(() => import('./apps/Logs'));
const Meals = lazy(() => import('./meals/Meals'));
const Messages = lazy(() => import('./messages/Messages'));
const Profile = lazy(() => import ("./profile/Profile"));
const Sources = lazy(() => import('./sources/Sources'));
const Tasks = lazy(() => import('./commands/Tasks'));
const Todo = lazy(() => import('./apps/TodoList'));
const UserGroups = lazy(() => import("./users/Groups"));
const Users = lazy(() => import('./users/Users'));
const Watchers = lazy(() => import('./commands/Watchers'));

const Buttons = lazy(() => import('./basic-ui/Buttons'));
const Dropdowns = lazy(() => import('./basic-ui/Dropdowns'));
const Typography = lazy(() => import('./basic-ui/Typography'));

const BasicElements = lazy(() => import('./form-elements/BasicElements'));

const BasicTable = lazy(() => import('./tables/BasicTable'));

const Mdi = lazy(() => import('./icons/Mdi'));

const ChartJs = lazy(() => import('./charts/ChartJs'));

const Error404 = lazy(() => import('./error-pages/Error404'));
const Error500 = lazy(() => import('./error-pages/Error500'));

const Login = lazy(() => import('./user-pages/Login'));
const Register1 = lazy(() => import('./user-pages/Register'));
const TermsAndConditions = lazy(() => import('./user-pages/TermsAndConditions'));


const AppRoutes = () => {
  const user = useSelector((state) => state.auth.user)

  return (
    <Suspense fallback={<Spinner/>}>
      <Switch>
        <Route exact path="/terms-and-conditions" component={ TermsAndConditions } />
        <Route exact path="/expenses/travel/groups" component={ ExpenseTravelGroups } />
        <Route exact path="/expenses/travel/my" component={ ExpensesTravel } />
        <Route exact path="/earthquakes" component={ Earthquakes } />
        <Route exact path="/meals" component={ Meals } />
        <Route exact path="/profile" component={ Profile } />

        {user?.is_staff && <Route exact path="/" component={Dashboard}/>}
        {user?.is_staff && <Route exact path="/apps/logs" component={ Logs } />}
        {user?.is_staff && <Route exact path="/apps/messages" component={ Messages } />}
        {user?.is_staff && <Route exact path="/apps/todo" component={ Todo } />}
        {user?.is_staff && <Route exact path="/auth/groups" component={ UserGroups } />}
        {user?.is_staff && <Route exact path="/auth/users" component={ Users } />}
        {user?.is_staff && <Route exact path="/bots" component={ Bots } />}
        {user?.is_staff && <Route exact path="/commands/crons" component={ Crons } />}
        {user?.is_staff && <Route exact path="/commands/management" component={ Commands } />}
        {user?.is_staff && <Route exact path="/commands/tasks" component={ Tasks } />}
        {user?.is_staff && <Route exact path="/commands/watchers" component={ Watchers } />}
        {user?.is_staff && <Route exact path="/credit/calculator" component={ FinancesCalculator } />}
        {user?.is_staff && <Route exact path="/credit/details" component={ FinancesCreditDetails } />}
        {user?.is_staff && <Route exact path="/credit/payments" component={ FinancesPayments } />}
        {user?.is_staff && <Route exact path="/credit/timetables" component={ FinancesTimetables } />}
        {user?.is_staff && <Route exact path="/devices" component={ Devices } />}
        {user?.is_staff && <Route exact path="/expenses/car" component={ ExpensesCar } />}
        {user?.is_staff && <Route exact path="/finances/accounts/transactions/:id?" component={ FinancesAccountsTransactions } />}
        {user?.is_staff && <Route exact path="/finances/accounts/categorize" component={ FinancesCategorize } />}
        {user?.is_staff && <Route exact path="/fx-rates" component={ FXRates } />}
        {user?.is_staff && <Route exact path="/investments/bonds" component={ InvestmentsBonds } />}
        {user?.is_staff && <Route exact path="/investments/crypto" component={ InvestmentsCrypto } />}
        {user?.is_staff && <Route exact path="/investments/deposits" component={ InvestmentsDeposits } />}
        {user?.is_staff && <Route exact path="/investments/pension" component={ InvestmentsPension } />}
        {user?.is_staff && <Route exact path="/investments/stocks" component={ InvestmentsStocks } />}
        {user?.is_staff && <Route exact path="/investments/summary" component={ InvestmentsSummary } />}
        {user?.is_staff && <Route exact path="/sources" component={ Sources } />}

        <Route path="/basic-ui/buttons" component={ Buttons } />
        <Route path="/basic-ui/dropdowns" component={ Dropdowns } />
        <Route path="/basic-ui/typography" component={ Typography } />

        <Route path="/form-Elements/basic-elements" component={ BasicElements } />

        <Route path="/tables/basic-table" component={ BasicTable } />

        <Route path="/icons/mdi" component={ Mdi } />

        <Route path="/charts/chart-js" component={ ChartJs } />

        <Route path="/login" component={ Login } />
        <Route path="/register" component={ Register1 } />

        <Route path="/error-pages/error-404" component={ Error404 } />
        <Route path="/error-pages/error-500" component={ Error500 } />

        <Redirect to="/error-pages/error-404" />
      </Switch>
    </Suspense>
  );
}

export default AppRoutes;
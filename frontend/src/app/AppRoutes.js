import React, { Suspense, lazy } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';

import Spinner from '../app/shared/Spinner';
import { useSelector } from "react-redux";

const Dashboard = lazy(() => import('./dashboard/Dashboard'));
const Bots = lazy(() => import('./bots/Bots'));
const Camera = lazy(() => import ("./apps/Camera"));
const Commands = lazy(() => import('./commands/Commands'));
const Crons = lazy(() => import('./crons/Crons'));
const Devices = lazy(() => import('./devices/Devices'));
const Earthquakes = lazy(() => import('./earthquakes/Earthquakes'));
const ExchangeRates = lazy(() => import ("./exchange-rates/ExchangeRates"));
const Expenses = lazy(() => import('./expenses/Expenses'));
const ExpenseGroups = lazy(() => import("./expenses/ExpenseGroups"));
const FinancesAccounts = lazy(() => import ("./finances/Accounts/Accounts"));
const FinancesAccountDetails = lazy(() => import ("./finances/Accounts/AccountDetails/AccountDetails"));
const FinancesCategorize = lazy(() => import ("./finances/Categorize/Categorize"));
const FinancesCredit = lazy(() => import ("./finances/Credit"));
const FinancesCalculator = lazy(() => import ("./finances/Calculator"));
const FinancesPayments = lazy(() => import ("./finances/Payments/Payments"));
const FinancesStocks = lazy(() => import ("./finances/Stocks"));
const FinancesTimetables = lazy(() => import ("./finances/Timetables/Timetables"));
const Logs = lazy(() => import('./apps/Logs'));
const Meals = lazy(() => import('./meals/Meals'));
const Messages = lazy(() => import('./messages/Messages'));
const Profile = lazy(() => import ("./profile/Profile"));
const Todo = lazy(() => import('./apps/TodoList'));
const UserGroups = lazy(() => import("./users/Groups"));
const Users = lazy(() => import('./users/Users'));

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
        <Route exact path="/documentation/terms-and-conditions" component={ TermsAndConditions } />
        <Route exact path="/exchange-rates" component={ ExchangeRates } />
        <Route exact path="/expenses" component={ Expenses } />
        <Route exact path="/expenses/groups" component={ ExpenseGroups } />
        <Route exact path="/earthquakes" component={ Earthquakes } />
        <Route exact path="/meals" component={ Meals } />
        <Route exact path="/profile" component={ Profile } />

        {user?.is_staff && <Route exact path="/" component={Dashboard}/>}
        {user?.is_staff && <Route exact path="/apps/camera" component={ Camera } />}
        {user?.is_staff && <Route exact path="/apps/logs" component={ Logs } />}
        {user?.is_staff && <Route exact path="/apps/todo" component={ Todo } />}
        {user?.is_staff && <Route exact path="/bots" component={ Bots } />}
        {user?.is_staff && <Route exact path="/finances/accounts" component={ FinancesAccounts } />}
        {user?.is_staff && <Route exact path="/finances/accounts/:id" component={ FinancesAccountDetails } />}
        {user?.is_staff && <Route exact path="/finances/calculator" component={ FinancesCalculator } />}
        {user?.is_staff && <Route exact path="/finances/categorize" component={ FinancesCategorize } />}
        {user?.is_staff && <Route exact path="/finances/credit/details" component={ FinancesCredit } />}
        {user?.is_staff && <Route exact path="/finances/credit/payments" component={ FinancesPayments } />}
        {user?.is_staff && <Route exact path="/finances/credit/timetables" component={ FinancesTimetables } />}
        {user?.is_staff && <Route exact path="/finances/stocks" component={ FinancesStocks } />}
        {user?.is_staff && <Route exact path="/commands" component={ Commands } />}
        {user?.is_staff && <Route exact path="/crons" component={ Crons } />}
        {user?.is_staff && <Route exact path="/devices" component={ Devices } />}
        {user?.is_staff && <Route exact path="/messages" component={ Messages } />}
        {user?.is_staff && <Route exact path="/users" component={ Users } />}
        {user?.is_staff && <Route exact path="/groups" component={ UserGroups } />}

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
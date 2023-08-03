import React, { Component,Suspense, lazy } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';

import Spinner from '../app/shared/Spinner';

const Dashboard = lazy(() => import('./dashboard/Dashboard'));
const Bots = lazy(() => import('./bots/Bots'));
const Camera = lazy(() => import ("./apps/Camera"));
const Expenses = lazy(() => import ("./apps/Expenses"));
const Logs = lazy(() => import('./apps/Logs'));
const Todo = lazy(() => import('./apps/TodoList'));
const Crons = lazy(() => import('./crons/Crons'));
const Devices = lazy(() => import('./devices/Devices'));
const Earthquakes = lazy(() => import('./earthquakes/Earthquakes'));
const FinancesOverview = lazy(() => import ("./finances/Overview"));
const FinancesPayments = lazy(() => import ("./finances/Payment/Payments"));
const FinancesTimetables = lazy(() => import ("./finances/Timetable/Timetable"));
const Meals = lazy(() => import('./meals/Meals'));

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


class AppRoutes extends Component {
  render () {
    return (
      <Suspense fallback={<Spinner/>}>
        <Switch>
          <Route exact path="/dashboard" component={ Dashboard } />
          <Route exact path="/apps/camera" component={ Camera } />
          <Route exact path="/apps/expenses" component={ Expenses } />
          <Route exact path="/apps/logs" component={ Logs } />
          <Route exact path="/apps/todo" component={ Todo } />
          <Route exact path="/bots" component={ Bots } />
          <Route exact path="/finances/overview" component={ FinancesOverview } />
          <Route exact path="/finances/payments" component={ FinancesPayments } />
          <Route exact path="/finances/timetables" component={ FinancesTimetables } />
          <Route exact path="/crons" component={ Crons } />
          <Route exact path="/devices" component={ Devices } />
          <Route exact path="/earthquakes" component={ Earthquakes } />
          <Route exact path="/meals" component={ Meals } />

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
}

export default AppRoutes;
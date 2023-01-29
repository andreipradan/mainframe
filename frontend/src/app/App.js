import React, { useEffect, useState } from 'react';
import {withRouter, useLocation, useHistory} from 'react-router-dom';
import './App.scss';
import AppRoutes from './AppRoutes';
import Navbar from './shared/Navbar';
import Sidebar from './shared/Sidebar';
import Footer from './shared/Footer';
import { useSelector } from "react-redux";

const App = () => {
  const [isFullPageLayout, setIsFullPageLayout] = useState(false);
  const location = useLocation();
  const history = useHistory();
  const token = useSelector(state => state.auth.token)

  useEffect( () => onRouteChanged(), []);
  useEffect(() => {onRouteChanged()}, [location, token])

  const onRouteChanged = () => {
    console.log("route changed" + location.pathname)
    if (!token && !["/login", "/register"].includes(location.pathname)) {
      history.push("/login")
      return
    }
    const body = document.querySelector('body');
    if(location.pathname === '/layout/RtlLayout') {body.classList.add('rtl')}
    else {body.classList.remove('rtl')}
    window.scrollTo(0, 0);
    const fullPageLayoutRoutes = ['/login', '/user-pages/login-2', '/register', '/user-pages/register-2', '/user-pages/lockscreen', '/error-pages/error-404', '/error-pages/error-500', '/general-pages/landing-page'];
    for ( let i = 0; i < fullPageLayoutRoutes.length; i++ ) {
      if (location.pathname === fullPageLayoutRoutes[i]) {
        setIsFullPageLayout(true)
        document.querySelector('.page-body-wrapper').classList.add('full-page-wrapper');
        break;
      } else {
        setIsFullPageLayout(false)
        document.querySelector('.page-body-wrapper').classList.remove('full-page-wrapper');
      }
    }
  }

  let navbarComponent = !isFullPageLayout ? <Navbar/> : '';
  let sidebarComponent = !isFullPageLayout ? <Sidebar/> : '';
  let footerComponent = !isFullPageLayout ? <Footer/> : '';
  return (
    <div className="container-scroller">
      { sidebarComponent }
      <div className="container-fluid page-body-wrapper">
        { token && navbarComponent }
        <div className="main-panel">
          <div className="content-wrapper">
            <AppRoutes/>
          </div>
          { footerComponent }
        </div>
      </div>
    </div>
  );
}

export default withRouter(App);

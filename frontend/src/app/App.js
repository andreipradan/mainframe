import React, { useEffect, useState } from 'react';
import { withRouter, useLocation, useHistory } from 'react-router-dom';
import './App.scss';
import AppRoutes from './AppRoutes';
import Navbar from './shared/Navbar';
import Sidebar from './shared/Sidebar';
import Footer from './shared/Footer';
import { useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const publicRoutes = ['/login', '/register', '/terms-and-conditions'];
const fullPageLayoutRoutes = [
  '/login',
  '/register',
  '/terms-and-conditions',
  '/error-pages/error-404',
  '/error-pages/error-500',
];

const App = () => {
  const [isFullPageLayout, setIsFullPageLayout] = useState(false);
  const location = useLocation();
  const history = useHistory();
  const token = useSelector((state) => state.auth.token);
  const pathname = location.pathname.replace(/\/+$/, '') || '/';
  const isPublicRoute = publicRoutes.includes(pathname);

  const onRouteChanged = () => {
    if (!token && !publicRoutes.includes(pathname)) {
      history.push('/login');
      return;
    }
    window.scrollTo(0, 0);
    for (let i = 0; i < fullPageLayoutRoutes.length; i++) {
      if (pathname === fullPageLayoutRoutes[i]) {
        setIsFullPageLayout(true);
        document
          .querySelector('.page-body-wrapper')
          ?.classList.add('full-page-wrapper');
        break;
      } else {
        setIsFullPageLayout(false);
        document
          .querySelector('.page-body-wrapper')
          ?.classList.remove('full-page-wrapper');
      }
    }
  };

  useEffect(() => onRouteChanged(), []);
  useEffect(() => {
    onRouteChanged();
  }, [location, token]);

  const navbarComponent = !isFullPageLayout && !isPublicRoute ? <Navbar /> : '';
  const sidebarComponent =
    !isFullPageLayout && !isPublicRoute ? <Sidebar /> : '';
  const footerComponent = !isFullPageLayout && !isPublicRoute ? <Footer /> : '';
  return (
    <div className='container-scroller'>
      {sidebarComponent}
      <div className='container-fluid page-body-wrapper'>
        {token && navbarComponent}
        <div className='main-panel'>
          <ToastContainer />
          <div className='content-wrapper'>
            <AppRoutes />
          </div>
          {footerComponent}
        </div>
      </div>
    </div>
  );
};

export default withRouter(App);

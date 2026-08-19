import { createBrowserRouter } from 'react-router-dom';
import { Home } from '../Pages/Home.js';
import { Builder } from '../Pages/Builder.js';
import { Login } from '../Pages/Login.js';
import { Signup } from '../Pages/Signup.js';
import { ForgotPassword } from '../Pages/ForgotPassword.js';
import { ResetPassword } from '../Pages/ResetPassword.js';
import { VerifyEmail } from '../Pages/VerifyEmail.js';
import { Dashboard } from '../Pages/Dashboard.js';
import { ProtectedRoute } from '../components/ProtectedRoute.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/signup',
    element: <Signup />
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />
  },
  {
    path: '/reset-password',
    element: <ResetPassword />
  },
  {
    path: '/verify-email',
    element: <VerifyEmail />
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    )
  },
  {
    path: '/projects',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    )
  },
  {
    path: '/builder',
    element: (
      <ProtectedRoute>
        <Builder />
      </ProtectedRoute>
    )
  },
  {
    path: '/builder/:projectId',
    element: (
      <ProtectedRoute>
        <Builder />
      </ProtectedRoute>
    )
  }
]);
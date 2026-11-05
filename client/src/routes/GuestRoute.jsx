import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homeFor } from '../lib/roles.js';
import { PageSpinner } from '../components/ui/index.js';

/** Login/register pages: logged-in users are sent to their own dashboard. */
export default function GuestRoute({ children }) {
  const { status, user } = useAuth();
  if (status === 'loading') return <PageSpinner />;
  if (status === 'authenticated') return <Navigate to={homeFor(user)} replace />;
  return children ?? <Outlet />;
}

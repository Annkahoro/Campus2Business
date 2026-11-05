import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/** Org admin pages need an organization; without one, go to /org/setup (registration step 2). */
export default function RequireOrg() {
  const { organization } = useAuth();
  if (!organization) return <Navigate to="/org/setup" replace />;
  return <Outlet />;
}

import { Navigate } from 'react-router-dom';

/**
 * PrivateRoute â€” redirects to /login if no JWT token is found.
 * The actual authorization enforcement is server-side; this is purely UX.
 */
export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}


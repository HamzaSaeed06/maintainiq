import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import PublicAsset from './pages/PublicAsset';
import ReportIssue from './pages/ReportIssue';
import Issues from './pages/Issues';
import IssueDetail from './pages/IssueDetail';
import ManageUsers from './pages/ManageUsers';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

// Layout for authenticated routes — includes the sticky Navbar
function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      {/* Global toast container */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '13px',
            fontFamily: 'Inter, system-ui, sans-serif',
          },
          success: {
            iconTheme: { primary: 'var(--accent)', secondary: 'var(--accent-contrast)' },
          },
          error: {
            iconTheme: { primary: 'var(--danger)', secondary: '#fff' },
          },
          duration: 3500,
        }}
      />

      <Routes>
        {/* Auth / public routes — NO navbar */}
        <Route path="/login" element={<Login />} />
        <Route path="/public/asset/:slug" element={<PublicAsset />} />
        <Route path="/report/:slug" element={<ReportIssue />} />

        {/* Protected app routes — WITH navbar */}
        <Route
          element={
            <PrivateRoute>
              <AuthLayout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/assets/:id" element={<AssetDetail />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/issues/:id" element={<IssueDetail />} />
          <Route path="/users" element={<ManageUsers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

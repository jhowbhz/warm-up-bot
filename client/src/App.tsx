import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Instances from './pages/Instances';
import WarmingSchedule from './pages/WarmingSchedule';
import Contacts from './pages/Contacts';
import Bots from './pages/Bots';
import Attendances from './pages/Attendances';
import Settings from './pages/Settings';
import { Loader2 } from 'lucide-react';

function AppRoutes() {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Loader2 size={32} className="animate-spin text-green-500" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/instances" element={<Instances />} />
          <Route path="/schedule" element={<WarmingSchedule />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/bots" element={<Bots />} />
          <Route path="/attendances" element={<Attendances />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import LogEntryPage from './pages/LogEntryPage';
import HistoryPage from './pages/HistoryPage';
import WalkTestPage from './pages/WalkTestPage';
import AuthPage from './pages/AuthPage';
import './App.css';

function App() {
  const [session, setSession] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(!!session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="app-container">
        <main className="main-content">
          <Routes>
            <Route
              path="/auth"
              element={session ? <Navigate to="/" replace /> : <AuthPage />}
            />
            <Route
              path="/"
              element={session ? <LogEntryPage /> : <Navigate to="/auth" replace />}
            />
            <Route
              path="/history"
              element={session ? <HistoryPage /> : <Navigate to="/auth" replace />}
            />
            <Route
              path="/walk-test"
              element={session ? <WalkTestPage /> : <Navigate to="/auth" replace />}
            />
          </Routes>
        </main>

        {session && (
          <nav className="bottom-nav">
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Log Entry
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              History
            </NavLink>
            <NavLink
              to="/walk-test"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              6MWT
            </NavLink>
          </nav>
        )}
      </div>
    </Router>
  );
}

export default App;
// src/App.tsx - Add Navigation Link for WalkTestPage
// Import tools for routing (switching pages)
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
// Import the page components
import LogEntryPage from './pages/LogEntryPage';
import HistoryPage from './pages/HistoryPage';
import WalkTestPage from './pages/WalkTestPage'; // Import should already be here
// Import the main CSS file
import './App.css';

function App() {
  return (
    // Router wraps the whole app to enable navigation
    <Router>
      {/* div to contain the overall app layout */}
      <div className="app-container">
        {/* Main content area where pages will be displayed */}
        <main className="main-content">
          {/* Routes defines where to navigate */}
          <Routes>
            {/* When URL is '/', show LogEntryPage */}
            <Route path="/" element={<LogEntryPage />} />
            {/* When URL is '/history', show HistoryPage */}
            <Route path="/history" element={<HistoryPage />} />
            {/* When URL is '/walk-test', show WalkTestPage */}
            <Route path="/walk-test" element={<WalkTestPage />} /> {/* Route should already be here */}
          </Routes>
        </main>

        {/* Bottom navigation bar - ADD THE LINK HERE */}
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
          {/* *** ADD THIS NEW NAVLINK *** */}
          <NavLink
            to="/walk-test"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            6MWT
          </NavLink>
        </nav>
      </div>
    </Router>
  );
}

export default App; // Make the App component available to the rest of the app
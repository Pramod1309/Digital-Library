// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import WelcomeScreen from './pages/WelcomeScreen';
import AdminDashboard from './pages/AdminDashboard';
import SchoolDashboard from './pages/SchoolDashboard';
import SchoolRegistration from './pages/SchoolRegistration';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';
import './styles/theme.css';

function App() {
  // Initialize user state from sessionStorage if it exists
  const [user, setUser] = React.useState(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  return (
    <ThemeProvider>
      <Router>
        <Routes>
        <Route 
          path="/" 
          element={user ? (
            user.user_type === 'admin' ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/school" />
            )
          ) : (
            <WelcomeScreen />
          )} 
        />
        <Route 
          path="/login" 
          element={user ? (
            user.user_type === 'admin' ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/school" />
            )
          ) : (
            <LoginPage setUser={setUser} />
          )} 
        />
        <Route 
          path="/admin/*" 
          element={user && user.user_type === 'admin' ? (
            <AdminDashboard user={user} setUser={setUser} />
          ) : (
            <Navigate to="/login" />
          )} 
        />
        <Route 
          path="/school/*" 
          element={user && user.user_type === 'school' ? (
            <SchoolDashboard user={user} setUser={setUser} />
          ) : (
            <Navigate to="/login" />
          )} 
        />
        <Route 
          path="/register-school" 
          element={<SchoolRegistration />} 
        />
      </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

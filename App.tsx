
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User } from './types';
import { db } from './services/db';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Achievements from './pages/Achievements';
import Reports from './pages/Reports';
import Personal from './pages/Personal';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';
import Layout from './components/Layout';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => void;
  signup: (name: string, email: string, password?: string) => void;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing session
    const currentUser = db.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    } else {
      // Seed initial data if totally empty (e.g. fresh browser)
      db.seed();
    }
  }, []);

  const refreshUser = () => {
    const currentUser = db.getCurrentUser();
    if (currentUser) setUser(currentUser);
  }

  const login = (email: string, password?: string) => {
    try {
        const u = db.login(email, password);
        setUser(u);
    } catch (e) {
        alert(e instanceof Error ? e.message : "Login failed");
    }
  };

  const signup = (name: string, email: string, password?: string) => {
    try {
        const u = db.signup(name, email, password);
        // Ensure user specific data structures exist (like default list)
        db.seed(); 
        setUser(u);
    } catch (e) {
        alert(e instanceof Error ? e.message : "Signup failed");
    }
  }

  const logout = () => {
    db.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, refreshUser }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          
          <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="goals" element={<Goals />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="achievements" element={<Achievements />} />
            <Route path="reports" element={<Reports />} />
            <Route path="personal" element={<Personal />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;

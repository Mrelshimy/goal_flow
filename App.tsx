
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
import Layout from './components/Layout';

interface AuthContextType {
  user: User | null;
  login: (email: string) => void;
  signup: (name: string, email: string) => void;
  logout: () => void;
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
      // Seed data if first time
      db.seed();
    }
  }, []);

  const login = (email: string) => {
    try {
        const u = db.login(email);
        setUser(u);
    } catch (e) {
        alert(e instanceof Error ? e.message : "Login failed");
    }
  };

  const signup = (name: string, email: string) => {
    try {
        const u = db.signup(name, email);
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
    <AuthContext.Provider value={{ user, login, signup, logout }}>
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
          </Route>
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;

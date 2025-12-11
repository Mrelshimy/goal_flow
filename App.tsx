
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User } from './types';
import { db } from './services/db';
import { supabase } from './services/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Achievements from './pages/Achievements';
import Reports from './pages/Reports';
import Personal from './pages/Personal';
import Tasks from './pages/Tasks';
import KPIs from './pages/KPIs';
import Profile from './pages/Profile';
import Layout from './components/Layout';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<void>;
  signup: (name: string, email: string, password?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial Session Check
    db.getCurrentUser().then(u => {
        setUser(u);
        setIsLoading(false);
        if (u) db.seed();
    });

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const u = await db.getCurrentUser();
            setUser(u);
            if(u) db.seed();
        } else if (event === 'SIGNED_OUT') {
            setUser(null);
        }
        setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshUser = async () => {
    const currentUser = await db.getCurrentUser();
    if (currentUser) setUser(currentUser);
  }

  const login = async (email: string, password?: string) => {
     await db.login(email, password);
  };

  const signup = async (name: string, email: string, password?: string) => {
     await db.signup(name, email, password);
  }

  const logout = async () => {
    await db.logout();
  };

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, refreshUser, isLoading }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          
          <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="goals" element={<Goals />} />
            <Route path="kpis" element={<KPIs />} />
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

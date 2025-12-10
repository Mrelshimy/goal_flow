import React, { useState } from 'react';
import { useAuth } from '../App';
import { User, Lock, Mail } from 'lucide-react';

const Login: React.FC = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, signup } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignup) {
        if (name && email && password) {
            signup(name, email);
        }
    } else {
        if (email && password) {
            login(email);
        }
    }
  };

  const toggleMode = () => {
      setIsSignup(!isSignup);
      // Reset form on toggle for cleaner UX
      setName('');
      setEmail('');
      setPassword('');
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-100 animate-fade-in">
        <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">G</div>
            <h1 className="text-2xl font-bold text-gray-800">{isSignup ? 'Create Account' : 'Welcome Back'}</h1>
            <p className="text-gray-500 text-sm mt-2">
                {isSignup ? 'Start tracking your career growth today' : 'Sign in to your GoalFlow dashboard'}
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            {isSignup && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none transition-all"
                            placeholder="John Doe"
                            required={isSignup}
                        />
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none transition-all"
                        placeholder="you@company.com"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none transition-all"
                        placeholder="••••••••"
                        required
                    />
                </div>
            </div>

            <button type="submit" className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-blue-600 transition-colors shadow-sm mt-2">
                {isSignup ? 'Sign Up' : 'Sign In'}
            </button>
        </form>

        <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
                {isSignup ? "Already have an account? " : "Don't have an account? "}
                <button onClick={toggleMode} className="text-primary font-semibold hover:underline">
                    {isSignup ? 'Sign In' : 'Sign Up'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
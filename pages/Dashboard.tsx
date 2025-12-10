
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Goal, Achievement, Task } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight, Award, Target, TrendingUp, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setGoals(db.getGoals());
    setAchievements(db.getAchievements());
    setTasks(db.getTasks());
  }, []);

  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.progress === 100).length;
  const avgProgress = totalGoals > 0 
    ? Math.round(goals.reduce((acc, curr) => acc + curr.progress, 0) / totalGoals) 
    : 0;
  
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const chartData = goals.map(g => ({
    name: g.title.length > 15 ? g.title.substring(0, 15) + '...' : g.title,
    progress: g.progress
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here's your career progress overview.</p>
        </div>
        <div className="flex gap-2">
            <Link to="/achievements" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Log Achievement
            </Link>
            <Link to="/goals" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 shadow-sm">
                Add New Goal
            </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="p-3 bg-blue-50 rounded-lg text-primary">
                    <Target size={24} />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                    <TrendingUp size={12} /> On Track
                </span>
            </div>
            <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">{totalGoals}</span>
                <p className="text-sm text-gray-500">Active Goals</p>
            </div>
            <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${avgProgress}%` }}></div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{avgProgress}% Average Completion</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                    <Award size={24} />
                </div>
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                    Total
                </span>
            </div>
            <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">{achievements.length}</span>
                <p className="text-sm text-gray-500">Achievements Logged</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">Latest: {achievements[achievements.length-1]?.date || 'None'}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <div className="p-3 bg-green-50 rounded-lg text-green-600">
                    <ArrowUpRight size={24} />
                </div>
             </div>
             <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">{completedGoals}</span>
                <p className="text-sm text-gray-500">Completed Goals</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">Great job!</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
             <div className="flex justify-between items-start">
                <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
                    <ListTodo size={24} />
                </div>
             </div>
             <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">{pendingTasks}</span>
                <p className="text-sm text-gray-500">Pending Tasks</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">{completedTasks} Completed</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Goal Progress</h3>
            <div className="h-64">
                {goals.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData}>
                         <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                         <YAxis fontSize={12} tickLine={false} axisLine={false} />
                         <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#F3F4F6' }}
                         />
                         <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.progress === 100 ? '#4CAF50' : '#4A6CF7'} />
                            ))}
                         </Bar>
                     </BarChart>
                 </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">No goals data available</div>
                )}
               
            </div>
        </div>

        {/* Recent Achievements List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Achievements</h3>
            <div className="space-y-4">
                {achievements.slice(0, 5).reverse().map((ach) => (
                    <div key={ach.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{ach.title}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ach.summary}</p>
                        <div className="flex justify-between items-center mt-2">
                             <span className={`text-[10px] px-2 py-0.5 rounded-full 
                                ${ach.classification === 'Leadership' ? 'bg-purple-100 text-purple-700' : 
                                  ach.classification === 'Delivery' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {ach.classification}
                             </span>
                             <span className="text-[10px] text-gray-400">{ach.date}</span>
                        </div>
                    </div>
                ))}
                {achievements.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No achievements yet.</p>
                )}
            </div>
            <Link to="/achievements" className="block text-center text-sm text-primary font-medium mt-4 hover:underline">View All</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { generateReflection } from '../services/geminiService';
import { Habit } from '../types';
import { Plus, Check, Flame, Sparkles } from 'lucide-react';

const Personal: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [reflection, setReflection] = useState('');
  const [isLoadingReflection, setIsLoadingReflection] = useState(false);

  useEffect(() => {
    setHabits(db.getHabits());
  }, []);

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName) return;
    const h: Habit = {
        id: crypto.randomUUID(),
        userId: 'user-1',
        name: newHabitName,
        streakCount: 0,
        lastLoggedDate: '',
        history: []
    };
    db.saveHabit(h);
    setNewHabitName('');
    setHabits(db.getHabits());
  };

  const toggleHabit = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    db.toggleHabitForDate(id, today);
    setHabits(db.getHabits());
  };

  const handleGenerateReflection = async () => {
    setIsLoadingReflection(true);
    const goals = db.getGoals();
    const result = await generateReflection(habits, goals);
    setReflection(result);
    setIsLoadingReflection(false);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-800">Personal & Habits</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Habit Tracker */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="font-semibold text-gray-800 mb-4">Daily Habits</h2>
            
            <form onSubmit={addHabit} className="flex gap-2 mb-6">
                <input 
                    type="text" 
                    value={newHabitName}
                    onChange={e => setNewHabitName(e.target.value)}
                    placeholder="New habit (e.g., Read 15 mins)"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button type="submit" className="bg-primary text-white p-2 rounded-md hover:bg-blue-600">
                    <Plus size={20} />
                </button>
            </form>

            <div className="space-y-3">
                {habits.map(habit => {
                    const isDoneToday = habit.history.includes(today);
                    return (
                        <div key={habit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => toggleHabit(habit.id)}
                                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all
                                        ${isDoneToday ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white hover:border-green-500'}
                                    `}
                                >
                                    {isDoneToday && <Check size={14} />}
                                </button>
                                <span className={isDoneToday ? 'text-gray-400 line-through' : 'text-gray-800'}>
                                    {habit.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-bold text-orange-500">
                                <Flame size={14} className={habit.streakCount > 0 ? 'fill-orange-500' : 'text-gray-300'} />
                                {habit.streakCount}
                            </div>
                        </div>
                    );
                })}
                {habits.length === 0 && <p className="text-gray-400 text-sm text-center">No habits added.</p>}
            </div>
        </div>

        {/* AI Reflection */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl shadow-md text-white">
            <div className="flex justify-between items-start mb-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                    <Sparkles size={20} className="text-yellow-300" /> AI Monthly Reflection
                </h2>
            </div>
            
            {reflection ? (
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg text-sm leading-relaxed animate-fade-in">
                    <div className="whitespace-pre-wrap">{reflection}</div>
                </div>
            ) : (
                <div className="h-40 flex flex-col items-center justify-center text-center">
                    <p className="text-white/80 mb-4 text-sm">Generate insights based on your recent habit consistency and goal progress.</p>
                    <button 
                        onClick={handleGenerateReflection}
                        disabled={isLoadingReflection}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-full text-sm font-bold shadow hover:bg-indigo-50 disabled:opacity-70 transition-transform hover:scale-105"
                    >
                        {isLoadingReflection ? 'Reflecting...' : 'Generate Reflection'}
                    </button>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default Personal;
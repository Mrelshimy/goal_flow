
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { classifyAndSummarizeAchievement } from '../services/geminiService';
import { Achievement, AchievementType } from '../types';
import { Plus, Wand2, Trash2, Calendar, Folder, Pencil } from 'lucide-react';

const Achievements: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [classification, setClassification] = useState<AchievementType>(AchievementType.OTHER);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    setAchievements(db.getAchievements().reverse());
  }, []);

  const handleAIProcess = async () => {
    if (!description || !title) return;
    setIsLoadingAI(true);
    const result = await classifyAndSummarizeAchievement(title, description);
    setClassification(result.classification);
    setSummary(result.summary);
    setIsLoadingAI(false);
  };

  const handleEdit = (ach: Achievement) => {
    setTitle(ach.title);
    setDescription(ach.description);
    setProject(ach.project);
    setDate(ach.date);
    setClassification(ach.classification);
    setSummary(ach.summary);
    setEditingId(ach.id);
    setIsFormOpen(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const achId = editingId || crypto.randomUUID();
    const existing = editingId ? achievements.find(a => a.id === editingId) : null;

    const newAchievement: Achievement = {
      id: achId,
      userId: existing?.userId || 'user-1',
      title,
      description,
      project,
      date,
      classification,
      summary: summary || description, // Fallback if AI wasn't used
      createdAt: existing?.createdAt || new Date().toISOString()
    };
    db.saveAchievement(newAchievement);
    setAchievements(db.getAchievements().reverse());
    resetForm();
  };

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setTitle('');
    setDescription('');
    setProject('');
    setClassification(AchievementType.OTHER);
    setSummary('');
  };

  const handleDelete = (id: string) => {
    db.deleteAchievement(id);
    setAchievements(db.getAchievements().reverse());
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Achievements</h1>
        <button 
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} /> Log Achievement
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 animate-fade-in">
           <div className="flex justify-between mb-4">
               <h2 className="text-lg font-semibold">{editingId ? 'Edit Achievement' : 'Log New Achievement'}</h2>
               <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">Cancel</button>
           </div>
           
           <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input type="text" required value={title} onChange={e => setTitle(e.target.value)} 
                        className="mt-1 w-full border border-gray-300 rounded-md p-2 shadow-sm focus:border-primary focus:ring" 
                        placeholder="What did you do?" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Project / Context</label>
                    <input type="text" value={project} onChange={e => setProject(e.target.value)} 
                        className="mt-1 w-full border border-gray-300 rounded-md p-2 shadow-sm" 
                        placeholder="e.g. Q3 Marketing Campaign" />
                </div>
             </div>

             <div>
                 <label className="block text-sm font-medium text-gray-700">Description</label>
                 <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3}
                    className="mt-1 w-full border border-gray-300 rounded-md p-2 shadow-sm" 
                    placeholder="Provide details..." />
             </div>

             {/* AI Button */}
             <div className="flex justify-end">
                <button type="button" onClick={handleAIProcess} disabled={isLoadingAI || !description}
                    className="text-primary text-sm font-medium flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded transition-colors disabled:opacity-50">
                    <Wand2 size={14} /> 
                    {isLoadingAI ? 'Analyzing...' : 'Auto-Classify & Summarize'}
                </button>
             </div>

             <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Classification (AI)</label>
                        <select value={classification} onChange={e => setClassification(e.target.value as AchievementType)}
                             className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-white">
                            {Object.values(AchievementType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                             className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-white" />
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Executive Summary (AI)</label>
                    <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2}
                        className="mt-1 w-full border border-gray-300 rounded-md p-2 bg-white" 
                        placeholder="AI will generate a concise summary here..." />
                 </div>
             </div>
             
             {/* File Upload Mock */}
             <div>
                <label className="block text-sm font-medium text-gray-700">Evidence (Optional)</label>
                <input type="file" className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-primary
                  hover:file:bg-blue-100" 
                />
             </div>

             <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600">
                    {editingId ? 'Update Achievement' : 'Save Achievement'}
                </button>
            </div>
           </form>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {achievements.map((ach) => (
            <div key={ach.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                         <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide
                                ${ach.classification === 'Leadership' ? 'bg-purple-100 text-purple-700' : 
                                  ach.classification === 'Delivery' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {ach.classification}
                         </span>
                         <span className="flex items-center text-xs text-gray-500 gap-1">
                            <Calendar size={12} /> {ach.date}
                         </span>
                         {ach.project && (
                            <span className="flex items-center text-xs text-gray-500 gap-1">
                                <Folder size={12} /> {ach.project}
                            </span>
                         )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{ach.title}</h3>
                    <p className="text-gray-800 font-medium mt-1 italic text-sm bg-gray-50 p-2 rounded border border-gray-100 inline-block">
                        "{ach.summary}"
                    </p>
                    <p className="text-gray-500 text-sm mt-2">{ach.description}</p>
                </div>
                <div className="flex md:flex-col justify-start md:justify-end items-end gap-2 mt-2 md:mt-0">
                    <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); handleEdit(ach); }} 
                        className="p-2 text-gray-400 hover:text-primary hover:bg-blue-50 rounded transition-colors" 
                        title="Edit"
                    >
                        <Pencil size={18} />
                    </button>
                    <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); handleDelete(ach.id); }} 
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" 
                        title="Delete"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        ))}
         {achievements.length === 0 && !isFormOpen && (
            <div className="text-center py-12">
                <p className="text-gray-500">No achievements logged yet.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Achievements;

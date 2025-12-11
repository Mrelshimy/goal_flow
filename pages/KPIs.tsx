
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../services/db';
import { KPI, Goal } from '../types';
import { Plus, X, Save, TrendingUp, Target, Activity, Filter, Trash2, ArrowRight } from 'lucide-react';

const KPIs: React.FC = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOption, setSortOption] = useState<'name' | 'progress_asc' | 'progress_desc'>('name');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  
  // Create/Edit Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'numeric' | 'percentage' | 'currency'>('numeric');
  const [targetValue, setTargetValue] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<string>('');
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);

  // Update Progress State
  const [progressUpdateId, setProgressUpdateId] = useState<string | null>(null);
  const [updateValue, setUpdateValue] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [kpisData, goalsData] = await Promise.all([
        db.getKPIs(),
        db.getGoals()
    ]);
    setKpis(kpisData);
    setGoals(goalsData);
    setIsLoading(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (kpi: KPI) => {
    setEditingId(kpi.id);
    setName(kpi.name);
    setDescription(kpi.description || '');
    setType(kpi.type);
    setTargetValue(kpi.targetValue.toString());
    setCurrentValue(kpi.currentValue.toString());
    setSelectedGoalIds(kpi.linkedGoalIds || []);
    setIsCreateOpen(true);
  };

  const handleOpenUpdateProgress = (kpi: KPI) => {
    setProgressUpdateId(kpi.id);
    setUpdateValue(kpi.currentValue.toString());
    setUpdateNotes(kpi.notes || '');
    setIsUpdateOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setType('numeric');
    setTargetValue('');
    setCurrentValue('0');
    setSelectedGoalIds([]);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetValue) return;

    const kpiId = editingId || crypto.randomUUID();
    const existing = editingId ? kpis.find(k => k.id === editingId) : null;

    const newKPI: KPI = {
        id: kpiId,
        userId: user?.id || '',
        name,
        description,
        type,
        targetValue: parseFloat(targetValue),
        currentValue: parseFloat(currentValue),
        linkedGoalIds: selectedGoalIds,
        notes: existing?.notes,
        createdAt: existing?.createdAt || new Date().toISOString()
    };

    await db.saveKPI(newKPI);
    fetchData();
    setIsCreateOpen(false);
  };

  const handleUpdateProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressUpdateId) return;

    const existingKPI = kpis.find(k => k.id === progressUpdateId);
    if (!existingKPI) return;

    const updatedKPI: KPI = {
        ...existingKPI,
        currentValue: parseFloat(updateValue),
        notes: updateNotes
    };

    await db.saveKPI(updatedKPI);
    fetchData();
    setIsUpdateOpen(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this KPI?')) {
        await db.deleteKPI(id);
        fetchData();
    }
  };

  const toggleGoalSelection = (goalId: string) => {
      if (selectedGoalIds.includes(goalId)) {
          setSelectedGoalIds(selectedGoalIds.filter(id => id !== goalId));
      } else {
          setSelectedGoalIds([...selectedGoalIds, goalId]);
      }
  };

  // Helper for display
  const formatValue = (val: number, type: string) => {
      if (type === 'currency') return `$${val.toLocaleString()}`;
      if (type === 'percentage') return `${val}%`;
      return val.toLocaleString();
  };

  const getProgressPercent = (current: number, target: number) => {
      if (target === 0) return 0;
      return Math.min(Math.round((current / target) * 100), 100);
  };

  const sortedKPIs = [...kpis].sort((a, b) => {
      const progA = getProgressPercent(a.currentValue, a.targetValue);
      const progB = getProgressPercent(b.currentValue, b.targetValue);
      
      if (sortOption === 'progress_asc') return progA - progB;
      if (sortOption === 'progress_desc') return progB - progA;
      return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">My KPIs</h1>
            <p className="text-gray-500">Track your key performance metrics.</p>
        </div>
        <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
        >
            <Plus size={18} /> Create KPI
        </button>
      </div>

      <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter size={16} />
              <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="bg-transparent border-none outline-none font-medium cursor-pointer"
              >
                  <option value="name">Sort by Name</option>
                  <option value="progress_desc">Highest Progress</option>
                  <option value="progress_asc">Lowest Progress</option>
              </select>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedKPIs.map(kpi => {
            const percent = getProgressPercent(kpi.currentValue, kpi.targetValue);
            let colorClass = 'bg-primary';
            if (percent < 30) colorClass = 'bg-red-500';
            else if (percent < 70) colorClass = 'bg-yellow-500';
            else colorClass = 'bg-green-500';

            return (
                <div key={kpi.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full hover:shadow-md transition-shadow relative group">
                     <button 
                        onClick={(e) => handleDelete(kpi.id, e)} 
                        className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 size={16} />
                    </button>

                    <div onClick={() => handleOpenEdit(kpi)} className="cursor-pointer flex-1">
                        <div className="flex items-center gap-2 mb-2">
                             <span className="text-xs uppercase font-bold tracking-wide text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{kpi.type}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{kpi.name}</h3>
                        {kpi.description && <p className="text-sm text-gray-500 mb-4 line-clamp-2">{kpi.description}</p>}
                        
                        <div className="flex items-end justify-between mb-2">
                            <span className="text-2xl font-bold text-gray-900">{formatValue(kpi.currentValue, kpi.type)}</span>
                            <span className="text-sm text-gray-400 mb-1">/ {formatValue(kpi.targetValue, kpi.type)}</span>
                        </div>

                        <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2 overflow-hidden">
                            <div className={`h-2.5 rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${percent}%` }}></div>
                        </div>
                        <p className="text-right text-xs font-semibold text-gray-500">{percent}% Achieved</p>

                        {kpi.linkedGoalIds && kpi.linkedGoalIds.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-100">
                                <p className="text-xs text-gray-400 mb-2">Linked Goals:</p>
                                <div className="flex flex-wrap gap-1">
                                    {kpi.linkedGoalIds.map(gid => {
                                        const g = goals.find(goal => goal.id === gid);
                                        return g ? (
                                            <span key={gid} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                                <Target size={10} /> {g.title.length > 20 ? g.title.substring(0, 20) + '...' : g.title}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {kpi.notes && (
                            <div className="mt-3 text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
                                " {kpi.notes} "
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <button 
                            onClick={() => handleOpenUpdateProgress(kpi)}
                            className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <Activity size={16} /> Update Progress
                        </button>
                    </div>
                </div>
            );
        })}
        {sortedKPIs.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No KPIs tracked yet</h3>
                <p className="text-gray-500">Create your first KPI to start measuring success.</p>
            </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h2 className="text-lg font-bold text-gray-800">{editingId ? 'Edit KPI' : 'Create KPI'}</h2>
                      <button onClick={() => setIsCreateOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto">
                      <form id="kpi-form" onSubmit={handleCreateSubmit} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">KPI Name</label>
                              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="e.g. Monthly Sales" />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                  <select value={type} onChange={e => setType(e.target.value as any)} className="w-full border rounded-lg p-2 bg-white">
                                      <option value="numeric">Numeric</option>
                                      <option value="currency">Currency</option>
                                      <option value="percentage">Percentage</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                                  <input required type="number" step="any" value={targetValue} onChange={e => setTargetValue(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="100" />
                              </div>
                          </div>

                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary/20 outline-none resize-none" placeholder="What does this measure?" />
                          </div>

                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Link Goals</label>
                              <div className="border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1 bg-gray-50">
                                  {goals.map(g => (
                                      <div key={g.id} onClick={() => toggleGoalSelection(g.id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${selectedGoalIds.includes(g.id) ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200 text-gray-700'}`}>
                                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedGoalIds.includes(g.id) ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                                              {selectedGoalIds.includes(g.id) && <ArrowRight size={10} className="text-white" />}
                                          </div>
                                          <span className="truncate">{g.title}</span>
                                      </div>
                                  ))}
                                  {goals.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No goals available to link.</p>}
                              </div>
                          </div>
                      </form>
                  </div>

                  <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
                      <button onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
                      <button form="kpi-form" type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
                          <Save size={18} /> Save KPI
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Update Progress Modal */}
      {isUpdateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden">
                   <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h2 className="text-lg font-bold text-gray-800">Update Progress</h2>
                      <button onClick={() => setIsUpdateOpen(false)}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
                  </div>
                  
                  <div className="p-6">
                      <form id="progress-form" onSubmit={handleUpdateProgressSubmit} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
                              <div className="relative">
                                  <input 
                                    autoFocus
                                    required 
                                    type="number" 
                                    step="any" 
                                    value={updateValue} 
                                    onChange={e => setUpdateValue(e.target.value)} 
                                    className="w-full border rounded-lg p-3 text-lg font-bold text-center focus:ring-2 focus:ring-primary/20 outline-none" 
                                  />
                              </div>
                          </div>

                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                              <textarea 
                                rows={2} 
                                value={updateNotes} 
                                onChange={e => setUpdateNotes(e.target.value)} 
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary/20 outline-none resize-none text-sm" 
                                placeholder="Any context for this update?" 
                              />
                          </div>
                      </form>
                  </div>

                   <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
                      <button onClick={() => setIsUpdateOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">Cancel</button>
                      <button form="progress-form" type="submit" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
                          <Activity size={18} /> Update
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default KPIs;

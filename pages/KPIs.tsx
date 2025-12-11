
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../services/db';
import { KPI, Goal } from '../types';
import { Plus, X, Save, TrendingUp, Target, Activity, Filter, Trash2, ArrowRight, Loader2, Pencil, Scale, Users, Link as LinkIcon, Building2 } from 'lucide-react';

const KPIs: React.FC = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOption, setSortOption] = useState<'name' | 'progress_asc' | 'progress_desc'>('name');
  const [filterLevel, setFilterLevel] = useState<'all' | 'individual' | 'department'>('all');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingLinkedData, setIsFetchingLinkedData] = useState(false);
  
  // Create/Edit Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'numeric' | 'percentage' | 'currency'>('numeric');
  const [targetValue, setTargetValue] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<string>('0');
  const [weight, setWeight] = useState<string>('1');
  const [level, setLevel] = useState<'individual' | 'department'>('individual');
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  
  // Linking State
  const [availableChildKPIs, setAvailableChildKPIs] = useState<KPI[]>([]); // For Dept Head
  const [selectedChildKpiIds, setSelectedChildKpiIds] = useState<string[]>([]); // For Dept Head
  
  const [departmentKPIs, setDepartmentKPIs] = useState<KPI[]>([]); // For Employees (to select Parent)
  const [parentKpiId, setParentKpiId] = useState<string>(''); // For Employees

  // Update Progress State
  const [progressUpdateId, setProgressUpdateId] = useState<string | null>(null);
  const [updateValue, setUpdateValue] = useState<string>('');
  const [updateNotes, setUpdateNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
        setIsLoading(true);
        const [kpisData, goalsData] = await Promise.all([
            db.getKPIs(),
            db.getGoals()
        ]);
        setKpis(kpisData);
        setGoals(goalsData);
    } catch (e) {
        console.error("Error fetching data", e);
    } finally {
        setIsLoading(false);
    }
  };

  const fetchLinkingData = async () => {
      setIsFetchingLinkedData(true);
      try {
        if (user?.role === 'department_head') {
            // Dept Heads can link children
            const children = await db.getDepartmentEmployeeKPIs();
            setAvailableChildKPIs(children);
        } else {
            // Employees can link to a parent (Dept KPI)
            const parents = await db.getDepartmentKPIs();
            setDepartmentKPIs(parents);
        }
      } catch (e) {
          console.error("Error fetching linking data", e);
      } finally {
          setIsFetchingLinkedData(false);
      }
  };

  const generateId = () => {
    return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
    // Fetch data asynchronously after opening
    fetchLinkingData();
  };

  const handleOpenEdit = async (kpi: KPI) => {
    setEditingId(kpi.id);
    setName(kpi.name);
    setDescription(kpi.description || '');
    setType(kpi.type);
    setTargetValue(kpi.targetValue.toString());
    setCurrentValue(kpi.currentValue.toString());
    setWeight(kpi.weight ? kpi.weight.toString() : '1');
    setLevel(kpi.level || 'individual');
    setSelectedGoalIds(kpi.linkedGoalIds || []);
    setParentKpiId(kpi.parentKpiId || '');
    
    setIsCreateOpen(true); // Open first
    
    // Then fetch and populate
    setIsFetchingLinkedData(true);
    if (user?.role === 'department_head') {
        const children = await db.getDepartmentEmployeeKPIs();
        setAvailableChildKPIs(children);
        const childIds = children.filter(c => c.parentKpiId === kpi.id).map(c => c.id);
        setSelectedChildKpiIds(childIds);
    } else {
        const parents = await db.getDepartmentKPIs();
        setDepartmentKPIs(parents);
    }
    setIsFetchingLinkedData(false);
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
    setWeight('1');
    setLevel('individual');
    setSelectedGoalIds([]);
    setSelectedChildKpiIds([]);
    setParentKpiId('');
    setIsSaving(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetValue) return;

    setIsSaving(true);
    try {
        const kpiId = editingId || generateId();
        const existing = editingId ? kpis.find(k => k.id === editingId) : null;

        const newKPI: KPI = {
            id: kpiId,
            userId: existing?.userId || user?.id || '', 
            name,
            description,
            type,
            targetValue: parseFloat(targetValue),
            currentValue: parseFloat(currentValue) || 0,
            weight: parseFloat(weight) || 1,
            linkedGoalIds: selectedGoalIds,
            level: level,
            notes: existing?.notes,
            parentKpiId: parentKpiId || undefined, // Set by Employee
            createdAt: existing?.createdAt || new Date().toISOString()
        };

        await db.saveKPI(newKPI);

        // Link Children (Dept Head sets children for this parent)
        if (user?.role === 'department_head' && level === 'department') {
            await db.linkChildKPIs(kpiId, selectedChildKpiIds);
        }

        await fetchData();
        setIsCreateOpen(false);
    } catch (error: any) {
        console.error("Failed to save KPI", error);
        alert(`Failed to save KPI: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleUpdateProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressUpdateId) return;

    setIsSaving(true);
    try {
        const existingKPI = kpis.find(k => k.id === progressUpdateId);
        if (!existingKPI) return;

        const updatedKPI: KPI = {
            ...existingKPI,
            currentValue: parseFloat(updateValue) || 0,
            notes: updateNotes
        };

        await db.saveKPI(updatedKPI);
        await fetchData();
        setIsUpdateOpen(false);
    } catch (error: any) {
        console.error("Failed to update KPI progress", error);
        alert(`Failed to update progress: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
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
  
  const toggleChildSelection = (childId: string) => {
      if (selectedChildKpiIds.includes(childId)) {
          setSelectedChildKpiIds(selectedChildKpiIds.filter(id => id !== childId));
      } else {
          setSelectedChildKpiIds([...selectedChildKpiIds, childId]);
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

  const filteredKpis = kpis.filter(k => {
      if (filterLevel === 'all') return true;
      return k.level === filterLevel;
  });

  const sortedKPIs = [...filteredKpis].sort((a, b) => {
      // Show Dept KPIs first if mixed
      if (a.level !== b.level) return a.level === 'department' ? -1 : 1;

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
            <h1 className="text-2xl font-bold text-gray-800">KPIs</h1>
            <p className="text-gray-500">
                {user?.role === 'department_head' 
                    ? `Managing ${user.department || 'Team'} performance.` 
                    : "Track your key performance metrics."}
            </p>
        </div>
        <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
        >
            <Plus size={18} /> Create KPI
        </button>
      </div>

      <div className="flex flex-wrap gap-3 justify-end mb-4 items-center">
          {user?.role === 'department_head' && (
              <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setFilterLevel('all')} 
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterLevel === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      All
                  </button>
                  <button 
                    onClick={() => setFilterLevel('department')} 
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterLevel === 'department' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      Department
                  </button>
                  <button 
                    onClick={() => setFilterLevel('individual')} 
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterLevel === 'individual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      Individual
                  </button>
              </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border px-3 py-1.5 rounded-lg">
              <Filter size={14} />
              <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="bg-transparent border-none outline-none font-medium cursor-pointer text-xs"
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
            
            const isDept = kpi.level === 'department';
            const linkedParent = kpis.find(p => p.id === kpi.parentKpiId);

            return (
                <div key={kpi.id} className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col h-full hover:shadow-md transition-shadow relative group ${isDept ? 'border-purple-200 ring-1 ring-purple-50' : 'border-gray-200'}`}>
                     {/* Action Buttons - Only allow Edit/Delete if owner or Dept Head */}
                     {(user?.id === kpi.userId || user?.role === 'department_head') && (
                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenEdit(kpi); }}
                                className="p-1.5 text-gray-300 hover:text-primary hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                            >
                                <Pencil size={16} />
                            </button>
                            <button 
                                onClick={(e) => handleDelete(kpi.id, e)} 
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                     )}

                    <div onClick={() => (user?.id === kpi.userId || user?.role === 'department_head') && handleOpenEdit(kpi)} className="cursor-pointer flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                             {isDept ? (
                                 <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 flex items-center gap-1 uppercase tracking-wider">
                                     <Building2 size={10} /> Department
                                 </span>
                             ) : (
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase tracking-wider">
                                     Individual
                                </span>
                             )}
                             <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded bg-gray-50">{kpi.type}</span>
                             {kpi.weight !== 1 && (
                                 <span className="text-[10px] text-gray-500 flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100" title="Weight">
                                     <Scale size={10} /> {kpi.weight}x
                                 </span>
                             )}
                        </div>

                        <h3 className="text-lg font-bold text-gray-800 mb-0.5">{kpi.name}</h3>
                        
                        {/* Owner Badge for Team View */}
                        {user?.role === 'department_head' && kpi.userId !== user.id && (
                             <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                <Users size={12} /> 
                                <span>{kpi.ownerName || 'Team Member'}</span>
                             </div>
                        )}

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
                                <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide font-bold">Linked Goals</p>
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
                        
                        {/* Parent Link Indicator */}
                        {linkedParent && (
                             <div className="mt-2 text-xs text-purple-600 flex items-center gap-1 bg-purple-50 w-fit px-2 py-1 rounded">
                                 <LinkIcon size={12} /> Linked to: <span className="font-semibold">{linkedParent.name}</span>
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
                <h3 className="text-lg font-medium text-gray-900">No KPIs found</h3>
                <p className="text-gray-500">Adjust filters or create a new KPI.</p>
            </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h2 className="text-lg font-bold text-gray-800">{editingId ? 'Edit KPI' : 'Create KPI'}</h2>
                      <button onClick={() => !isSaving && setIsCreateOpen(false)} disabled={isSaving}><X size={20} className="text-gray-400 hover:text-gray-600 disabled:opacity-50" /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto">
                      <form id="kpi-form" onSubmit={handleCreateSubmit} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">KPI Name</label>
                              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="e.g. Monthly Sales" disabled={isSaving} />
                          </div>
                          
                          {/* Role Specific Settings */}
                          {user?.role === 'department_head' && (
                              <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                  <label className="block text-sm font-bold text-purple-900 mb-2">KPI Level</label>
                                  <div className="flex gap-4">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                          <input 
                                            type="radio" 
                                            name="level" 
                                            value="individual" 
                                            checked={level === 'individual'} 
                                            onChange={() => setLevel('individual')}
                                            className="text-purple-600 focus:ring-purple-500"
                                          />
                                          <span className="text-sm text-gray-700">Individual (My KPI)</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                          <input 
                                            type="radio" 
                                            name="level" 
                                            value="department" 
                                            checked={level === 'department'} 
                                            onChange={() => setLevel('department')}
                                            className="text-purple-600 focus:ring-purple-500"
                                          />
                                          <span className="text-sm text-gray-700 font-semibold">Department KPI</span>
                                      </label>
                                  </div>
                              </div>
                          )}

                          {/* Employee Linking Section */}
                          {user?.role !== 'department_head' && (
                               <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Link to Department Objective</label>
                                  <div className="relative">
                                      <LinkIcon className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                      <select 
                                        value={parentKpiId} 
                                        onChange={e => setParentKpiId(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-primary outline-none bg-white"
                                        disabled={isSaving || isFetchingLinkedData}
                                      >
                                          <option value="">
                                            {isFetchingLinkedData ? 'Loading Departments...' : '-- Select Parent KPI --'}
                                          </option>
                                          {departmentKPIs.map(dp => (
                                              <option key={dp.id} value={dp.id}>{dp.name} ({dp.ownerName})</option>
                                          ))}
                                      </select>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">Connect your work to the bigger picture.</p>
                               </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                  <select value={type} onChange={e => setType(e.target.value as any)} className="w-full border rounded-lg p-2 bg-white" disabled={isSaving}>
                                      <option value="numeric">Numeric</option>
                                      <option value="currency">Currency</option>
                                      <option value="percentage">Percentage</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                                  <input required type="number" step="any" value={targetValue} onChange={e => setTargetValue(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="100" disabled={isSaving} />
                              </div>
                          </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (Priority)</label>
                                  <input 
                                    type="number" 
                                    step="0.1" 
                                    min="0"
                                    value={weight} 
                                    onChange={e => setWeight(e.target.value)} 
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary/20 outline-none" 
                                    placeholder="1.0" 
                                    disabled={isSaving} 
                                  />
                              </div>
                          </div>

                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary/20 outline-none resize-none" placeholder="What does this measure?" disabled={isSaving} />
                          </div>

                          {/* Goal Linking */}
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Link Goals (Personal)</label>
                              <div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1 bg-gray-50">
                                  {goals.map(g => (
                                      <div key={g.id} onClick={() => !isSaving && toggleGoalSelection(g.id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${selectedGoalIds.includes(g.id) ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200 text-gray-700'} ${isSaving ? 'pointer-events-none opacity-50' : ''}`}>
                                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedGoalIds.includes(g.id) ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                                              {selectedGoalIds.includes(g.id) && <ArrowRight size={10} className="text-white" />}
                                          </div>
                                          <span className="truncate">{g.title}</span>
                                      </div>
                                  ))}
                                  {goals.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No personal goals available.</p>}
                              </div>
                          </div>
                          
                          {/* Child KPI Linking (Dept Head Only) */}
                          {user?.role === 'department_head' && level === 'department' && (
                              <div className="mt-4 border-t pt-4">
                                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                      <LinkIcon size={16} className="text-purple-600" /> Link Employee KPIs
                                  </label>
                                  <div className="border rounded-lg p-2 max-h-40 overflow-y-auto space-y-1 bg-purple-50 border-purple-100">
                                      {availableChildKPIs.length > 0 ? availableChildKPIs.map(child => (
                                          <div key={child.id} onClick={() => !isSaving && toggleChildSelection(child.id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${selectedChildKpiIds.includes(child.id) ? 'bg-purple-200 text-purple-900 font-medium' : 'hover:bg-purple-100 text-gray-700'} ${isSaving ? 'pointer-events-none opacity-50' : ''}`}>
                                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedChildKpiIds.includes(child.id) ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'}`}>
                                                  {selectedChildKpiIds.includes(child.id) && <ArrowRight size={10} className="text-white" />}
                                              </div>
                                              <div className="flex-1 truncate">
                                                  <span className="font-semibold text-xs text-gray-500 mr-2">[{child.ownerName}]</span>
                                                  {child.name}
                                              </div>
                                          </div>
                                      )) : (
                                          <p className="text-xs text-gray-400 text-center py-2">No employee KPIs found in your department.</p>
                                      )}
                                  </div>
                                  <p className="text-[10px] text-gray-500 mt-1">Selected KPIs will be linked to this Department KPI.</p>
                              </div>
                          )}

                      </form>
                  </div>

                  <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
                      <button onClick={() => setIsCreateOpen(false)} disabled={isSaving} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50">Cancel</button>
                      <button 
                        form="kpi-form" 
                        type="submit" 
                        disabled={isSaving}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                          {isSaving ? 'Saving...' : 'Save KPI'}
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
                      <button onClick={() => !isSaving && setIsUpdateOpen(false)} disabled={isSaving}><X size={20} className="text-gray-400 hover:text-gray-600 disabled:opacity-50" /></button>
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
                                    disabled={isSaving}
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
                                disabled={isSaving}
                              />
                          </div>
                      </form>
                  </div>

                   <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
                      <button onClick={() => setIsUpdateOpen(false)} disabled={isSaving} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50">Cancel</button>
                      <button 
                        form="progress-form" 
                        type="submit" 
                        disabled={isSaving}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                           {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />} 
                           {isSaving ? 'Updating...' : 'Update'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default KPIs;
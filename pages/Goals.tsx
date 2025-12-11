
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../services/db';
import { generateSmartGoal, generateMilestones } from '../services/geminiService';
import { Goal, GoalCategory, Milestone, Task, TaskList } from '../types';
import { Plus, Trash2, Wand2, CheckCircle, Circle, Save, X, ChevronDown, ChevronUp, Target, Pencil, Tag, Link as LinkIcon, Loader2, ListPlus, ArrowRight } from 'lucide-react';

const Goals: React.FC = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create/Edit State
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory>(GoalCategory.CAREER);
  const [description, setDescription] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [newMilestones, setNewMilestones] = useState<Omit<Milestone, 'id' | 'goalId'>[]>([]);

  // Manual Milestone State
  const [milestoneInput, setMilestoneInput] = useState('');
  const [milestoneDateInput, setMilestoneDateInput] = useState('');
  const [editingMilestoneIndex, setEditingMilestoneIndex] = useState<number | null>(null);

  // Convert Milestone to Task State
  const [convertModalData, setConvertModalData] = useState<{milestone: Milestone, goalId: string} | null>(null);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    refreshGoals();
  }, []);

  const refreshGoals = async () => {
      setLoading(true);
      const [g, t, l] = await Promise.all([
          db.getGoals(), 
          db.getTasks(),
          db.getTaskLists()
      ]);
      setGoals(g);
      setTasks(t);
      setTaskLists(l);
      if (l.length > 0 && !selectedListId) setSelectedListId(l[0].id);
      setLoading(false);
  };

  const handleSmartGoal = async () => {
    if (!description) return;
    setIsLoadingAI(true);
    const smartDesc = await generateSmartGoal(description);
    setDescription(smartDesc);
    setIsLoadingAI(false);
  };

  const handleGenerateMilestones = async () => {
    if (!title || !timeframe) return;
    setIsLoadingAI(true);
    const generated = await generateMilestones(title, timeframe);
    setNewMilestones(generated);
    setIsLoadingAI(false);
  };

  const handleAddMilestone = () => {
    if (!milestoneInput) return;
    
    const newM: Omit<Milestone, 'id' | 'goalId'> = {
        description: milestoneInput,
        dueDate: milestoneDateInput,
        status: 'pending'
    };

    if (editingMilestoneIndex !== null) {
        const updated = [...newMilestones];
        updated[editingMilestoneIndex] = {
            ...updated[editingMilestoneIndex],
            description: milestoneInput,
            dueDate: milestoneDateInput
        };
        setNewMilestones(updated);
        setEditingMilestoneIndex(null);
    } else {
        setNewMilestones([...newMilestones, newM]);
    }
    
    setMilestoneInput('');
    setMilestoneDateInput('');
  };

  const handleEditMilestoneLocal = (index: number) => {
    const m = newMilestones[index];
    setMilestoneInput(m.description);
    setMilestoneDateInput(m.dueDate);
    setEditingMilestoneIndex(index);
  };

  const handleDeleteMilestoneLocal = (index: number) => {
    const updated = newMilestones.filter((_, i) => i !== index);
    setNewMilestones(updated);
    if (editingMilestoneIndex === index) {
        setEditingMilestoneIndex(null);
        setMilestoneInput('');
        setMilestoneDateInput('');
    }
  };

  const handleEdit = (goal: Goal) => {
    setTitle(goal.title);
    setCategory(goal.category);
    setDescription(goal.description);
    setTimeframe(goal.timeframe);
    setNewMilestones(goal.milestones.map(m => ({
        description: m.description,
        status: m.status,
        dueDate: m.dueDate
    })));
    setEditingId(goal.id);
    setIsCreating(true);
    setMilestoneInput('');
    setMilestoneDateInput('');
    setEditingMilestoneIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingAI(true); 
    
    const goalId = editingId || crypto.randomUUID();
    const existingGoal = editingId ? goals.find(g => g.id === editingId) : null;

    const goalToSave: Goal = {
      id: goalId,
      userId: existingGoal?.userId || user?.id || '',
      title,
      category,
      description,
      timeframe,
      progress: existingGoal ? existingGoal.progress : 0,
      createdAt: existingGoal?.createdAt || new Date().toISOString(),
      milestones: newMilestones.map(m => ({
        id: crypto.randomUUID(), 
        goalId: goalId,
        description: m.description,
        status: m.status || 'pending',
        dueDate: m.dueDate
      })) as Milestone[],
      tags: existingGoal?.tags || [],
      isCompleted: existingGoal?.isCompleted,
      completedAt: existingGoal?.completedAt
    };
    
    await db.saveGoal(goalToSave);
    await refreshGoals();
    resetForm();
    setIsLoadingAI(false);
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setTitle('');
    setDescription('');
    setTimeframe('');
    setNewMilestones([]);
    setMilestoneInput('');
    setMilestoneDateInput('');
    setEditingMilestoneIndex(null);
  };

  const handleDelete = async (id: string) => {
    await db.deleteGoal(id);
    refreshGoals();
  };

  const toggleMilestone = async (goal: Goal, milestoneId: string) => {
    const updatedMilestones = goal.milestones.map(m => {
        if (m.id === milestoneId) {
            return { ...m, status: m.status === 'completed' ? 'pending' : 'completed' } as Milestone;
        }
        return m;
    });
    const updatedGoal = { ...goal, milestones: updatedMilestones };
    await db.saveGoal(updatedGoal);
    refreshGoals();
  };

  const toggleLinkedTask = async (task: Task) => {
      const updatedTask = { 
          ...task, 
          status: task.status === 'completed' ? 'pending' : 'completed',
          completedAt: task.status === 'completed' ? undefined : new Date().toISOString()
      } as Task;
      await db.saveTask(updatedTask);
      refreshGoals();
  };

  const toggleGoalCompletion = async (goal: Goal, e: React.MouseEvent) => {
      e.stopPropagation();
      const updatedGoal = { ...goal, isCompleted: !goal.isCompleted };
      await db.saveGoal(updatedGoal);
      refreshGoals();
  };

  // --- Milestone to Task Logic ---
  const openConvertModal = (milestone: Milestone, goalId: string) => {
      setConvertModalData({ milestone, goalId });
      // Fallback: If no list selected but lists exist, select the first one
      if (!selectedListId && taskLists.length > 0) {
          setSelectedListId(taskLists[0].id);
      }
  };

  const handleConvertSubmit = async () => {
      // Robust selection of list ID
      let targetListId = selectedListId;
      if (!targetListId && taskLists.length > 0) {
          targetListId = taskLists[0].id;
      }

      if (!convertModalData || !targetListId) {
          if (taskLists.length === 0) {
              alert("No task lists found. Please create a list in the Tasks page first.");
          }
          return;
      }

      setIsConverting(true);
      try {
        const newTask: Task = {
            id: crypto.randomUUID(),
            userId: user?.id || '',
            listId: targetListId,
            linkedGoalId: convertModalData.goalId,
            title: convertModalData.milestone.description,
            dueDate: convertModalData.milestone.dueDate,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        await db.saveTask(newTask);

        // Remove the milestone from the goal to prevent duplication (it's now a linked task)
        const goalToUpdate = goals.find(g => g.id === convertModalData.goalId);
        if (goalToUpdate) {
            const updatedMilestones = goalToUpdate.milestones.filter(m => m.id !== convertModalData.milestone.id);
            const updatedGoal = { ...goalToUpdate, milestones: updatedMilestones };
            await db.saveGoal(updatedGoal);
        }

        setConvertModalData(null);
        await refreshGoals(); // Refresh to show the new linked task and removed milestone
      } catch (e) {
        console.error("Failed to convert milestone to task", e);
      } finally {
        setIsConverting(false);
      }
  };

  if (loading && goals.length === 0) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Goals</h1>
        
        {!isCreating && (
             <button 
                onClick={() => { resetForm(); setIsCreating(true); }}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
            >
                <Plus size={18} /> New Goal
            </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 animate-fade-in mb-6">
        <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit Goal' : 'Create New Goal'}</h2>
            <button onClick={resetForm}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Goal Title</label>
                    <input 
                        type="text" 
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-blue-200 border p-2"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g., Get Promoted to Senior"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring border p-2"
                        value={category}
                        onChange={e => setCategory(e.target.value as GoalCategory)}
                    >
                        <option value={GoalCategory.CAREER}>Career</option>
                        <option value={GoalCategory.PERSONAL}>Personal</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Timeframe</label>
                <input 
                    type="text" 
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                    value={timeframe}
                    onChange={e => setTimeframe(e.target.value)}
                    placeholder="e.g., Q4 2024"
                />
            </div>

            <div>
                <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <button 
                        type="button"
                        onClick={handleSmartGoal}
                        disabled={isLoadingAI || !description}
                        className="text-xs text-primary flex items-center gap-1 hover:underline disabled:opacity-50"
                    >
                        <Wand2 size={12} /> AI Make SMART
                    </button>
                </div>
                <textarea 
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe your goal..."
                />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">Milestones</label>
                    <button 
                        type="button"
                        onClick={handleGenerateMilestones}
                        disabled={isLoadingAI || !title}
                        className="text-xs text-primary flex items-center gap-1 hover:underline disabled:opacity-50"
                    >
                        <Wand2 size={12} /> AI Generate
                    </button>
                </div>
                
                {/* Manual Milestone Input */}
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        value={milestoneInput}
                        onChange={e => setMilestoneInput(e.target.value)}
                        placeholder="Add milestone..."
                        className="flex-1 text-sm border border-gray-300 rounded-md p-2"
                    />
                     <input 
                        type="date" 
                        value={milestoneDateInput}
                        onChange={e => setMilestoneDateInput(e.target.value)}
                        className="w-32 text-sm border border-gray-300 rounded-md p-2"
                    />
                    <button 
                        type="button"
                        onClick={handleAddMilestone}
                        disabled={!milestoneInput}
                        className="bg-primary text-white p-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                    >
                        {editingMilestoneIndex !== null ? <CheckCircle size={18} /> : <Plus size={18} />}
                    </button>
                </div>

                {newMilestones.length > 0 ? (
                    <ul className="space-y-2">
                        {newMilestones.map((m, idx) => (
                            <li key={idx} className="flex gap-2 text-sm bg-white p-2 rounded border border-gray-200 items-center justify-between group">
                                <div className="flex gap-2 items-center flex-1">
                                    <span className="font-semibold text-gray-500 text-xs w-20 shrink-0">{m.dueDate || 'No Date'}</span>
                                    <span>{m.description}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-2 rounded-full ${m.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {m.status}
                                    </span>
                                    <div className="flex gap-1 ml-2">
                                        <button 
                                            type="button" 
                                            onClick={() => handleEditMilestoneLocal(idx)} 
                                            className="text-gray-400 hover:text-primary"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => handleDeleteMilestoneLocal(idx)} 
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-gray-400 italic">No milestones yet. Use AI to generate or add manually.</p>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={isLoadingAI} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
                    {isLoadingAI ? 'Thinking...' : <><Save size={18} /> {editingId ? 'Update Goal' : 'Save Goal'}</>}
                </button>
            </div>
        </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {goals.map((goal) => (
            <GoalCard 
                key={goal.id} 
                goal={goal}
                linkedTasks={tasks.filter(t => t.linkedGoalId === goal.id)} 
                onDelete={handleDelete} 
                onEdit={handleEdit}
                onToggleMilestone={toggleMilestone}
                onToggleLinkedTask={toggleLinkedTask}
                onToggleCompletion={toggleGoalCompletion}
                onConvertMilestone={(m) => openConvertModal(m, goal.id)}
            />
        ))}
        {goals.length === 0 && !isCreating && (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <Target size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No goals yet</h3>
                <p className="text-gray-500">Create your first goal to start tracking.</p>
            </div>
        )}
      </div>

      {/* Convert Modal */}
      {convertModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Add as Task</h3>
                      {!isConverting && <button onClick={() => setConvertModalData(null)}><X size={20} className="text-gray-400" /></button>}
                  </div>
                  
                  <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Create a task from milestone:</p>
                      <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm font-medium">
                          "{convertModalData.milestone.description}"
                      </div>
                  </div>

                  <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Task List</label>
                      <select 
                          value={selectedListId}
                          onChange={(e) => setSelectedListId(e.target.value)}
                          className="w-full border rounded-md p-2 bg-white"
                          disabled={isConverting}
                      >
                          {taskLists.map(list => (
                              <option key={list.id} value={list.id}>{list.title}</option>
                          ))}
                          {taskLists.length === 0 && <option value="">No lists available</option>}
                      </select>
                      {taskLists.length === 0 && <p className="text-xs text-red-500 mt-1">Please create a list in Tasks first.</p>}
                  </div>

                  <div className="flex justify-end gap-2">
                      <button onClick={() => setConvertModalData(null)} disabled={isConverting} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
                      <button 
                        onClick={handleConvertSubmit} 
                        disabled={isConverting || taskLists.length === 0} 
                        className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {isConverting ? <Loader2 size={16} className="animate-spin" /> : <ListPlus size={16} />} 
                          {isConverting ? 'Adding...' : 'Add Task'}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

// ... GoalCard (Same as before but ensures types are correct)
const GoalCard: React.FC<{
    goal: Goal; 
    linkedTasks: Task[];
    onDelete: (id: string) => void;
    onEdit: (goal: Goal) => void;
    onToggleMilestone: (g: Goal, mid: string) => void;
    onToggleLinkedTask: (t: Task) => void;
    onToggleCompletion: (g: Goal, e: React.MouseEvent) => void;
    onConvertMilestone: (m: Milestone) => void;
}> = ({ goal, linkedTasks, onDelete, onEdit, onToggleMilestone, onToggleLinkedTask, onToggleCompletion, onConvertMilestone }) => {
    const [expanded, setExpanded] = useState(false);
    
    const completedMilestones = goal.milestones.filter(m => m.status === 'completed').length;
    const completedTasks = linkedTasks.filter(t => t.status === 'completed').length;
    
    const totalItems = goal.milestones.length + linkedTasks.length;
    const totalCompleted = completedMilestones + completedTasks;

    return (
        <div className={`bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden ${goal.isCompleted ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
            <div className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                goal.category === 'Career' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                                {goal.category}
                            </span>
                            
                            {goal.tags && goal.tags.length > 0 && goal.tags.map((tag, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                                    <Tag size={10} /> {tag}
                                </span>
                            ))}

                            <span className="text-xs text-gray-500">Due {goal.timeframe}</span>
                            
                            {goal.isCompleted && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                    <CheckCircle size={10} /> Completed
                                </span>
                            )}
                        </div>
                        <h3 className={`text-xl font-bold ${goal.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{goal.title}</h3>
                    </div>
                    <div className="flex gap-1">
                        <button 
                            type="button" 
                            onClick={(e) => onToggleCompletion(goal, e)} 
                            className={`p-2 rounded transition-colors ${goal.isCompleted ? 'text-green-600 bg-green-100' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                            title={goal.isCompleted ? "Reopen Goal" : "Mark as Complete"}
                        >
                            <CheckCircle size={18} />
                        </button>
                        <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); onEdit(goal); }} 
                            className="p-2 text-gray-400 hover:text-primary hover:bg-blue-50 rounded transition-colors"
                        >
                            <Pencil size={18} />
                        </button>
                        <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); onDelete(goal.id); }} 
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
                
                <p className="text-gray-600 mt-2 text-sm">{goal.description}</p>
                
                <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">Progress</span>
                        <span className="text-primary font-bold">{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all duration-500 ${goal.isCompleted ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${goal.progress}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Milestones Accordion */}
            <div className="bg-gray-50 border-t border-gray-100">
                <button 
                    onClick={() => setExpanded(!expanded)}
                    className="w-full px-6 py-3 flex justify-between items-center text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                    <span>Milestones & Tasks ({totalCompleted}/{totalItems})</span>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {expanded && (
                    <div className="px-6 pb-4 space-y-2 animate-fade-in">
                        {goal.milestones.map(m => (
                            <div key={m.id} 
                                className="flex items-center justify-between p-2 hover:bg-white rounded group"
                            >
                                <div 
                                    className="flex items-start gap-3 cursor-pointer flex-1"
                                    onClick={() => onToggleMilestone(goal, m.id)}
                                >
                                    <div className={`mt-0.5 ${m.status === 'completed' ? 'text-green-500' : 'text-gray-300 group-hover:text-gray-400'}`}>
                                        {m.status === 'completed' ? <CheckCircle size={18} /> : <Circle size={18} />}
                                    </div>
                                    <div className={m.status === 'completed' ? 'opacity-50 line-through' : ''}>
                                        <p className="text-sm text-gray-800">{m.description}</p>
                                        <p className="text-xs text-gray-500">Due: {m.dueDate}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onConvertMilestone(m); }}
                                    className="text-indigo-500 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded transition-colors"
                                    title="Add as Task"
                                >
                                    <ListPlus size={16} />
                                </button>
                            </div>
                        ))}

                        {linkedTasks.map(t => (
                            <div key={t.id}
                                onClick={() => onToggleLinkedTask(t)}
                                className="flex items-start gap-3 p-2 hover:bg-white rounded cursor-pointer group border-l-2 border-blue-100 pl-3"
                            >
                                <div className={`mt-0.5 ${t.status === 'completed' ? 'text-green-500' : 'text-gray-300 group-hover:text-gray-400'}`}>
                                    {t.status === 'completed' ? <CheckCircle size={18} /> : <Circle size={18} />}
                                </div>
                                <div className="flex-1">
                                    <div className={`flex items-center gap-2 ${t.status === 'completed' ? 'opacity-50 line-through' : ''}`}>
                                        <p className="text-sm text-gray-800">{t.title}</p>
                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                            <LinkIcon size={8} /> Linked Task
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">{t.dueDate ? `Due: ${t.dueDate}` : 'No due date'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Goals;

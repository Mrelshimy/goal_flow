
import { supabase } from './supabase';
import { Goal, Achievement, Habit, User, Milestone, Task, TaskList, KPI } from '../types';

// Map Supabase Profile to App User
const mapProfileToUser = (profile: any): User => ({
  id: profile.id,
  name: profile.full_name || profile.email?.split('@')[0] || 'User',
  email: profile.email || '',
  avatar: profile.avatar_url,
  title: profile.job_title
});

class DBService {
  
  // --- Auth Wrappers ---
  
  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // Fetch extra profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile) return mapProfileToUser(profile);
    
    // Fallback if profile trigger failed
    return {
      id: session.user.id,
      name: session.user.user_metadata.full_name || 'User',
      email: session.user.email || ''
    };
  }

  async login(email: string, password?: string): Promise<User> {
    if (!password) throw new Error("Password required");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Login failed");
    
    return (await this.getCurrentUser()) as User;
  }

  async signup(name: string, email: string, password?: string): Promise<User> {
    if (!password) throw new Error("Password required");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });
    if (error) throw error;
    if (!data.user) throw new Error("Signup failed");
    
    // Wait a moment for trigger to create profile
    await new Promise(r => setTimeout(r, 1000));
    return (await this.getCurrentUser()) as User;
  }

  async logout() {
    await supabase.auth.signOut();
  }

  async updateUser(updates: Partial<User> & { password?: string }): Promise<User> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No session");

    // Update Password if provided
    if (updates.password) {
      const { error } = await supabase.auth.updateUser({ password: updates.password });
      if (error) throw error;
    }

    // Update Profile
    const profileUpdates: any = {};
    if (updates.name) profileUpdates.full_name = updates.name;
    if (updates.title !== undefined) profileUpdates.job_title = updates.title;
    if (updates.avatar !== undefined) profileUpdates.avatar_url = updates.avatar;

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);
      if (error) throw error;
    }

    return (await this.getCurrentUser()) as User;
  }

  // --- Goals ---
  
  async getGoals(): Promise<Goal[]> {
    const { data, error } = await supabase.from('goals').select('*');
    if (error) { console.error(error); return []; }
    
    // Map snake_case DB to camelCase Types
    return data.map((g: any) => ({
        ...g,
        userId: g.user_id,
        isCompleted: g.is_completed,
        completedAt: g.completed_at
    }));
  }

  async saveGoal(goal: Goal): Promise<Goal> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user");

    // Recalculate progress using DB count of tasks
    // 1. Get linked tasks
    const { data: linkedTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('linked_goal_id', goal.id);
    
    let computedProgress = goal.progress;

    if (goal.isCompleted) {
        computedProgress = 100;
        if (!goal.completedAt) goal.completedAt = new Date().toISOString();
    } else {
        goal.completedAt = undefined;
        const tasks = linkedTasks || [];
        
        const totalMilestones = goal.milestones.length;
        const completedMilestones = goal.milestones.filter(m => m.status === 'completed').length;
        
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;

        const totalItems = totalMilestones + totalTasks;
        const completedItems = completedMilestones + completedTasks;

        computedProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : goal.progress;
    }

    // Prepare for DB
    const dbGoal = {
        id: goal.id,
        user_id: user.id,
        title: goal.title,
        category: goal.category,
        description: goal.description,
        timeframe: goal.timeframe,
        progress: computedProgress,
        milestones: goal.milestones,
        tags: goal.tags,
        is_completed: goal.isCompleted,
        completed_at: goal.completedAt,
        created_at: goal.createdAt
    };

    const { error } = await supabase.from('goals').upsert(dbGoal);
    if (error) throw error;
    
    return { ...goal, progress: computedProgress };
  }

  async deleteGoal(id: string) {
    await supabase.from('goals').delete().eq('id', id);
    // Linked tasks are set to null by ON DELETE SET NULL in SQL schema
  }

  // --- Task Lists ---

  async getTaskLists(): Promise<TaskList[]> {
    const { data, error } = await supabase.from('task_lists').select('*');
    if (error) return [];
    return data.map((l: any) => ({ ...l, userId: l.user_id, isDefault: l.is_default }));
  }

  async saveTaskList(list: TaskList): Promise<TaskList> {
    const { data: { user } } = await supabase.auth.getUser();
    const dbList = {
        id: list.id,
        user_id: user?.id,
        title: list.title,
        is_default: list.isDefault
    };
    await supabase.from('task_lists').upsert(dbList);
    return list;
  }

  async deleteTaskList(id: string) {
    // Check if default
    const { data } = await supabase.from('task_lists').select('is_default').eq('id', id).single();
    if (data?.is_default) return;

    await supabase.from('task_lists').delete().eq('id', id);
  }

  // --- Tasks ---

  async getTasks(): Promise<Task[]> {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) return [];
    return data.map((t: any) => ({
        ...t,
        userId: t.user_id,
        listId: t.list_id,
        linkedGoalId: t.linked_goal_id,
        dueDate: t.due_date,
        completedAt: t.completed_at,
        createdAt: t.created_at
    }));
  }

  async saveTask(task: Task): Promise<Task> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check previous state for goal update
    const { data: existing } = await supabase.from('tasks').select('linked_goal_id').eq('id', task.id).single();

    const dbTask = {
        id: task.id,
        user_id: user?.id,
        list_id: task.listId,
        linked_goal_id: task.linkedGoalId,
        title: task.title,
        details: task.details,
        due_date: task.dueDate,
        status: task.status,
        completed_at: task.completedAt,
        created_at: task.createdAt
    };

    const { error } = await supabase.from('tasks').upsert(dbTask);
    if (error) throw error;

    // Trigger goal progress updates
    if (task.linkedGoalId) {
        const goal = await this.getGoalById(task.linkedGoalId);
        if (goal) await this.saveGoal(goal);
    }
    if (existing?.linked_goal_id && existing.linked_goal_id !== task.linkedGoalId) {
        const goal = await this.getGoalById(existing.linked_goal_id);
        if (goal) await this.saveGoal(goal);
    }

    return task;
  }

  async deleteTask(id: string) {
    // Get task before delete to find linked goal
    const { data: task } = await supabase.from('tasks').select('linked_goal_id').eq('id', id).single();
    
    await supabase.from('tasks').delete().eq('id', id);

    if (task?.linked_goal_id) {
        const goal = await this.getGoalById(task.linked_goal_id);
        if (goal) await this.saveGoal(goal);
    }
  }

  // --- KPIs ---

  async getKPIs(): Promise<KPI[]> {
    const { data, error } = await supabase.from('kpis').select('*');
    if (error) return [];
    
    return data.map((k: any) => ({
        ...k,
        userId: k.user_id,
        targetValue: k.target_value,
        currentValue: k.current_value,
        linkedGoalIds: k.linked_goal_ids || [],
        createdAt: k.created_at
    }));
  }

  async saveKPI(kpi: KPI): Promise<KPI> {
    const { data: { user } } = await supabase.auth.getUser();
    const dbKPI = {
        id: kpi.id,
        user_id: user?.id,
        name: kpi.name,
        description: kpi.description,
        type: kpi.type,
        target_value: kpi.targetValue,
        current_value: kpi.currentValue,
        unit: kpi.unit,
        linked_goal_ids: kpi.linkedGoalIds,
        notes: kpi.notes,
        created_at: kpi.createdAt
    };

    const { error } = await supabase.from('kpis').upsert(dbKPI);
    if (error) throw error;
    return kpi;
  }

  async deleteKPI(id: string) {
    await supabase.from('kpis').delete().eq('id', id);
  }

  // --- Achievements ---

  async getAchievements(): Promise<Achievement[]> {
    const { data, error } = await supabase.from('achievements').select('*');
    if (error) return [];
    return data.map((a: any) => ({
        ...a,
        userId: a.user_id,
        evidenceUrl: a.evidence_url,
        createdAt: a.created_at
    }));
  }

  async saveAchievement(achievement: Achievement): Promise<Achievement> {
    const { data: { user } } = await supabase.auth.getUser();
    const dbAch = {
        id: achievement.id,
        user_id: user?.id,
        title: achievement.title,
        description: achievement.description,
        classification: achievement.classification,
        summary: achievement.summary,
        project: achievement.project,
        date: achievement.date,
        evidence_url: achievement.evidenceUrl,
        created_at: achievement.createdAt
    };
    await supabase.from('achievements').upsert(dbAch);
    return achievement;
  }

  async deleteAchievement(id: string) {
    await supabase.from('achievements').delete().eq('id', id);
  }

  // --- Habits ---

  async getHabits(): Promise<Habit[]> {
    const { data, error } = await supabase.from('habits').select('*');
    if (error) return [];
    return data.map((h: any) => ({
        ...h,
        userId: h.user_id,
        streakCount: h.streak_count,
        lastLoggedDate: h.last_logged_date
    }));
  }

  async saveHabit(habit: Habit): Promise<Habit> {
    const { data: { user } } = await supabase.auth.getUser();
    const dbHabit = {
        id: habit.id,
        user_id: user?.id,
        name: habit.name,
        streak_count: habit.streakCount,
        last_logged_date: habit.lastLoggedDate,
        history: habit.history
    };
    await supabase.from('habits').upsert(dbHabit);
    return habit;
  }

  async toggleHabitForDate(habitId: string, date: string): Promise<Habit> {
    const { data: habit } = await supabase.from('habits').select('*').eq('id', habitId).single();
    if (!habit) throw new Error("Not found");

    let history: string[] = habit.history || [];
    if (history.includes(date)) {
        history = history.filter(d => d !== date);
    } else {
        history.push(date);
    }

    // Recalculate streak logic (simplified reuse)
    const sortedHistory = [...history].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    if (sortedHistory.length > 0) {
        let currentCheck = new Date(sortedHistory[0]);
        const todayDate = new Date(today);
        const diffHours = (todayDate.getTime() - currentCheck.getTime()) / (1000 * 3600);
        
        if (diffHours <= 48) {
           streak = 1;
           for (let i = 0; i < sortedHistory.length - 1; i++) {
              const curr = new Date(sortedHistory[i]);
              const prev = new Date(sortedHistory[i+1]);
              const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 3600 * 24));
              if (diffDays === 1) streak++; else break;
           }
        }
    }

    const updated = {
        ...habit,
        history,
        streak_count: streak,
        last_logged_date: sortedHistory[0] || ''
    };

    await supabase.from('habits').update({
        history: updated.history,
        streak_count: updated.streak_count,
        last_logged_date: updated.last_logged_date
    }).eq('id', habitId);

    return {
        ...updated,
        userId: updated.user_id,
        streakCount: updated.streak_count,
        lastLoggedDate: updated.last_logged_date
    };
  }

  // --- Helper ---
  async getGoalById(id: string): Promise<Goal | null> {
    const { data } = await supabase.from('goals').select('*').eq('id', id).single();
    if (!data) return null;
    return {
        ...data,
        userId: data.user_id,
        isCompleted: data.is_completed,
        completedAt: data.completed_at
    };
  }

  // Seed default data for new user
  async seed() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Check if user has default list
    const { data: lists } = await supabase.from('task_lists').select('*').eq('user_id', user.id);
    if (!lists || lists.length === 0) {
        await supabase.from('task_lists').insert({
            user_id: user.id,
            title: 'My Tasks',
            is_default: true
        });
    }
  }

  // Legacy/File Backup (Deprecating for Sync, but keeping interface)
  async exportBackup() { return null; }
  async importBackup() { return null; }
}

export const db = new DBService();

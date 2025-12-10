
import { Goal, Achievement, Habit, User, Milestone, Task, TaskList } from '../types';

// Extended User type for internal DB storage including password
interface DBUser extends User {
  password?: string; // Optional for backward compatibility with existing mock data
}

// Initial Mock Data
const MOCK_USER: DBUser = {
  id: 'user-1',
  name: 'Alex Johnson',
  email: 'alex@example.com',
  password: 'password123',
  title: 'Senior Engineer'
};

const STORAGE_KEYS = {
  USER: 'gf_user', // Current session user
  USERS: 'gf_users', // Registered users list
  GOALS: 'gf_goals',
  ACHIEVEMENTS: 'gf_achievements',
  HABITS: 'gf_habits',
  TASKS: 'gf_tasks',
  TASK_LISTS: 'gf_task_lists',
};

class DBService {
  // --- Helpers for Raw Data Access ---
  private getRaw<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private saveRaw<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- Auth ---
  private getAllUsers(): DBUser[] {
    return this.getRaw<DBUser>(STORAGE_KEYS.USERS);
  }

  // Simple mock hash (Base64) to avoid storing plain text
  private hashPassword(password: string): string {
    return btoa(password);
  }

  login(email: string, password?: string): User {
    const users = this.getAllUsers();
    
    // Check registered users
    const registeredUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (registeredUser) {
        // If the user exists, we MUST check the password
        if (!password) throw new Error("Password is required.");
        
        // Check if password matches (hashed)
        // Note: For existing demo data without password, we allow login or force update
        if (registeredUser.password && registeredUser.password !== this.hashPassword(password)) {
            throw new Error("Invalid email or password.");
        }

        // Create a session object without the password
        const { password: _, ...userSession } = registeredUser;
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userSession));
        return userSession;
    }

    // Fallback for the very first run if no users exist at all
    if (users.length === 0 && email === 'alex@example.com') {
       const demoUser = { ...MOCK_USER, email };
       localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(demoUser));
       // Also save to registry so password check works next time
       this.saveRaw(STORAGE_KEYS.USERS, [{...demoUser, password: this.hashPassword('password123')}]);
       return demoUser;
    }

    throw new Error("User not found. Please sign up.");
  }

  signup(name: string, email: string, password?: string): User {
    const users = this.getAllUsers();
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("User with this email already exists.");
    }

    if (!password) throw new Error("Password is required for signup.");

    const newUser: DBUser = {
        id: crypto.randomUUID(),
        name,
        email,
        password: this.hashPassword(password)
    };

    users.push(newUser);
    this.saveRaw(STORAGE_KEYS.USERS, users);
    
    // Auto login (create session without password)
    const { password: _, ...userSession } = newUser;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userSession));
    return userSession;
  }

  logout() {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  getCurrentUser(): User | null {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  }

  updateUser(updates: Partial<User> & { password?: string }): User {
    const currentUser = this.getCurrentUser();
    if (!currentUser) throw new Error("No active session");

    const allUsers = this.getAllUsers();
    const userIndex = allUsers.findIndex(u => u.id === currentUser.id);

    if (userIndex === -1) throw new Error("User record not found");

    const existingUser = allUsers[userIndex];

    // Prepare updated user object
    const updatedDBUser: DBUser = {
        ...existingUser,
        ...updates,
        // Only update password if provided and not empty
        password: updates.password ? this.hashPassword(updates.password) : existingUser.password
    };
    
    // Remove password from updates object so it doesn't leak into the session object if we were doing object spread blindly on a User type
    // (Though TS protects us, runtime safety is good)
    
    // Save to permanent storage
    allUsers[userIndex] = updatedDBUser;
    this.saveRaw(STORAGE_KEYS.USERS, allUsers);

    // Update Session
    const { password: _, ...userSession } = updatedDBUser;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userSession));

    return userSession;
  }

  // --- Goals ---
  getGoals(): Goal[] {
    const user = this.getCurrentUser();
    if (!user) return [];
    return this.getRaw<Goal>(STORAGE_KEYS.GOALS).filter(g => g.userId === user.id);
  }

  saveGoal(goal: Goal): Goal {
    const allGoals = this.getRaw<Goal>(STORAGE_KEYS.GOALS);
    
    // Calculate progress logic (Using USER's tasks)
    let computedProgress = goal.progress;
    
    if (goal.isCompleted) {
        computedProgress = 100;
        if (!goal.completedAt) goal.completedAt = new Date().toISOString();
    } else {
        // Clear completedAt if reopened
        goal.completedAt = undefined;

        const userTasks = this.getTasks(); // This gets CURRENT USER tasks
        const linkedTasks = userTasks.filter(t => t.linkedGoalId === goal.id);

        const totalMilestones = goal.milestones.length;
        const completedMilestones = goal.milestones.filter(m => m.status === 'completed').length;
        
        const totalTasks = linkedTasks.length;
        const completedTasks = linkedTasks.filter(t => t.status === 'completed').length;

        const totalItems = totalMilestones + totalTasks;
        const completedItems = completedMilestones + completedTasks;

        computedProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : goal.progress;
    }

    const goalToSave = { ...goal, progress: computedProgress };

    const existingIndex = allGoals.findIndex((g) => g.id === goal.id);
    if (existingIndex >= 0) {
      allGoals[existingIndex] = goalToSave;
    } else {
      allGoals.push(goalToSave);
    }
    this.saveRaw(STORAGE_KEYS.GOALS, allGoals);
    return goalToSave;
  }

  deleteGoal(id: string) {
    const allGoals = this.getRaw<Goal>(STORAGE_KEYS.GOALS);
    const newGoals = allGoals.filter((g) => g.id !== id);
    this.saveRaw(STORAGE_KEYS.GOALS, newGoals);
    
    // Unlink tasks globally (safe because ID is UUID)
    const allTasks = this.getRaw<Task>(STORAGE_KEYS.TASKS);
    let tasksChanged = false;
    const updatedTasks = allTasks.map(t => {
        if (t.linkedGoalId === id) {
            tasksChanged = true;
            return { ...t, linkedGoalId: undefined };
        }
        return t;
    });
    if (tasksChanged) {
        this.saveRaw(STORAGE_KEYS.TASKS, updatedTasks);
    }
  }

  // --- Task Lists ---
  getTaskLists(): TaskList[] {
    const user = this.getCurrentUser();
    if (!user) return [];
    return this.getRaw<TaskList>(STORAGE_KEYS.TASK_LISTS).filter(l => l.userId === user.id);
  }

  saveTaskList(list: TaskList): TaskList {
    const allLists = this.getRaw<TaskList>(STORAGE_KEYS.TASK_LISTS);
    const existingIndex = allLists.findIndex(l => l.id === list.id);
    if (existingIndex >= 0) {
      allLists[existingIndex] = list;
    } else {
      allLists.push(list);
    }
    this.saveRaw(STORAGE_KEYS.TASK_LISTS, allLists);
    return list;
  }

  deleteTaskList(id: string) {
    const allLists = this.getRaw<TaskList>(STORAGE_KEYS.TASK_LISTS);
    const listToDelete = allLists.find(l => l.id === id);
    if (listToDelete?.isDefault) return;

    const updatedLists = allLists.filter(l => l.id !== id);
    this.saveRaw(STORAGE_KEYS.TASK_LISTS, updatedLists);

    // Delete tasks in this list
    const allTasks = this.getRaw<Task>(STORAGE_KEYS.TASKS);
    const tasksToDelete = allTasks.filter(t => t.listId === id);
    const remainingTasks = allTasks.filter(t => t.listId !== id);
    this.saveRaw(STORAGE_KEYS.TASKS, remainingTasks);

    // Trigger goal updates for deleted tasks that were linked
    const userGoals = this.getGoals(); // Only update current user's goals
    const uniqueGoalIds = new Set(tasksToDelete.map(t => t.linkedGoalId).filter(Boolean));
    uniqueGoalIds.forEach(gid => {
        const goal = userGoals.find(g => g.id === gid);
        if (goal) this.saveGoal(goal);
    });
  }

  // --- Tasks ---
  getTasks(): Task[] {
    const user = this.getCurrentUser();
    if (!user) return [];
    return this.getRaw<Task>(STORAGE_KEYS.TASKS).filter(t => t.userId === user.id);
  }

  saveTask(task: Task): Task {
    const allTasks = this.getRaw<Task>(STORAGE_KEYS.TASKS);
    const existingIndex = allTasks.findIndex(t => t.id === task.id);
    const previousTask = existingIndex >= 0 ? allTasks[existingIndex] : null;

    if (existingIndex >= 0) {
        allTasks[existingIndex] = task;
    } else {
        allTasks.push(task);
    }
    this.saveRaw(STORAGE_KEYS.TASKS, allTasks);

    // Update Goal Progress if linked
    const userGoals = this.getGoals();
    
    if (task.linkedGoalId) {
        const goal = userGoals.find(g => g.id === task.linkedGoalId);
        if (goal) this.saveGoal(goal);
    }

    if (previousTask?.linkedGoalId && previousTask.linkedGoalId !== task.linkedGoalId) {
         const goal = userGoals.find(g => g.id === previousTask.linkedGoalId);
         if (goal) this.saveGoal(goal);
    }

    return task;
  }

  deleteTask(id: string) {
    const allTasks = this.getRaw<Task>(STORAGE_KEYS.TASKS);
    const taskToDelete = allTasks.find(t => t.id === id);
    const updatedTasks = allTasks.filter(t => t.id !== id);
    this.saveRaw(STORAGE_KEYS.TASKS, updatedTasks);

    if (taskToDelete?.linkedGoalId) {
        const userGoals = this.getGoals();
        const goal = userGoals.find(g => g.id === taskToDelete.linkedGoalId);
        if (goal) this.saveGoal(goal);
    }
  }

  // --- Achievements ---
  getAchievements(): Achievement[] {
    const user = this.getCurrentUser();
    if (!user) return [];
    return this.getRaw<Achievement>(STORAGE_KEYS.ACHIEVEMENTS).filter(a => a.userId === user.id);
  }

  saveAchievement(achievement: Achievement): Achievement {
    const list = this.getRaw<Achievement>(STORAGE_KEYS.ACHIEVEMENTS);
    const existingIndex = list.findIndex((a) => a.id === achievement.id);
    if (existingIndex >= 0) {
      list[existingIndex] = achievement;
    } else {
      list.push(achievement);
    }
    this.saveRaw(STORAGE_KEYS.ACHIEVEMENTS, list);
    return achievement;
  }

  deleteAchievement(id: string) {
    const list = this.getRaw<Achievement>(STORAGE_KEYS.ACHIEVEMENTS);
    const updated = list.filter((a) => a.id !== id);
    this.saveRaw(STORAGE_KEYS.ACHIEVEMENTS, updated);
  }

  // --- Habits ---
  getHabits(): Habit[] {
    const user = this.getCurrentUser();
    if (!user) return [];
    return this.getRaw<Habit>(STORAGE_KEYS.HABITS).filter(h => h.userId === user.id);
  }

  saveHabit(habit: Habit): Habit {
    const list = this.getRaw<Habit>(STORAGE_KEYS.HABITS);
    const existingIndex = list.findIndex((h) => h.id === habit.id);
    if (existingIndex >= 0) {
      list[existingIndex] = habit;
    } else {
      list.push(habit);
    }
    this.saveRaw(STORAGE_KEYS.HABITS, list);
    return habit;
  }

  toggleHabitForDate(habitId: string, date: string): Habit {
    const allHabits = this.getRaw<Habit>(STORAGE_KEYS.HABITS);
    const habitIndex = allHabits.findIndex(h => h.id === habitId);
    if (habitIndex === -1) throw new Error("Habit not found");

    const habit = allHabits[habitIndex];
    const user = this.getCurrentUser();
    if (habit.userId !== user?.id) throw new Error("Unauthorized");

    const dateIndex = habit.history.indexOf(date);
    
    if (dateIndex >= 0) {
      habit.history.splice(dateIndex, 1);
    } else {
      habit.history.push(date);
    }
    
    // Recalculate streak
    const sortedHistory = [...habit.history].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
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
              if (diffDays === 1) {
                  streak++;
              } else {
                  break;
              }
           }
        }
    }
    
    habit.streakCount = streak;
    habit.lastLoggedDate = sortedHistory[0] || '';

    allHabits[habitIndex] = habit;
    this.saveRaw(STORAGE_KEYS.HABITS, allHabits);
    return habit;
  }

  // --- Seed Data ---
  seed() {
    const user = this.getCurrentUser();
    
    // Ensure default list exists for CURRENT user
    if (user) {
        const allLists = this.getRaw<TaskList>(STORAGE_KEYS.TASK_LISTS);
        const userList = allLists.find(l => l.userId === user.id);
        if (!userList) {
             const defaultList: TaskList = {
                id: crypto.randomUUID(),
                userId: user.id,
                title: 'My Tasks',
                isDefault: true
            };
            allLists.push(defaultList);
            this.saveRaw(STORAGE_KEYS.TASK_LISTS, allLists);
        }
    }
    
    // Only seed global demo data if totally empty
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
       // Seed the mock user with password
       this.saveRaw(STORAGE_KEYS.USERS, [{
           ...MOCK_USER,
           password: this.hashPassword(MOCK_USER.password || 'password123')
       }]);

       // Seed Goal
       const demoGoals: Goal[] = [{
          id: 'g1',
          userId: 'user-1',
          title: 'Become Senior Engineer',
          category: 'Career' as any,
          description: 'Get promoted to Senior Frontend Engineer by Q4.',
          timeframe: '2024',
          progress: 33,
          createdAt: new Date().toISOString(),
          milestones: [
            { id: 'm1', goalId: 'g1', description: 'Lead a major feature release', status: 'completed', dueDate: '2024-03-01' },
            { id: 'm2', goalId: 'g1', description: 'Mentor a junior dev', status: 'pending', dueDate: '2024-06-01' },
            { id: 'm3', goalId: 'g1', description: 'Complete system architecture course', status: 'pending', dueDate: '2024-09-01' },
          ]
       }];
       this.saveRaw(STORAGE_KEYS.GOALS, demoGoals);

       // Seed Achievement
       const demoAch: Achievement[] = [{
          id: 'a1',
          userId: 'user-1',
          title: 'Optimized Login Flow',
          description: 'Reduced login time by 40% by refactoring auth state management.',
          classification: 'Delivery' as any,
          summary: 'Delivered significant performance improvement to core authentication module.',
          project: 'Core Platform',
          date: '2024-02-15',
          createdAt: new Date().toISOString()
       }];
       this.saveRaw(STORAGE_KEYS.ACHIEVEMENTS, demoAch);
       
       // Seed List and Task
       const listId = 'list-default';
       const defaultList: TaskList = { id: listId, userId: 'user-1', title: 'My Tasks', isDefault: true };
       this.saveRaw(STORAGE_KEYS.TASK_LISTS, [defaultList]);

       const demoTasks: Task[] = [
            { id: 't1', listId: listId, userId: 'user-1', title: 'Review PR #405', details: 'Check for security vulnerabilities', status: 'pending', createdAt: new Date().toISOString() },
            { id: 't2', listId: listId, userId: 'user-1', title: 'Prepare 1:1 agenda', details: '', status: 'completed', completedAt: new Date().toISOString(), createdAt: new Date().toISOString() }
       ];
       this.saveRaw(STORAGE_KEYS.TASKS, demoTasks);
    }
  }
}

export const db = new DBService();


export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string; // Base64 image string
  title?: string; // Job Title
}

export enum GoalCategory {
  CAREER = 'Career',
  PERSONAL = 'Personal',
}

export enum AchievementType {
  LEADERSHIP = 'Leadership',
  DELIVERY = 'Delivery',
  COMMUNICATION = 'Communication',
  IMPACT = 'Impact',
  OTHER = 'Other'
}

export interface Milestone {
  id: string;
  goalId: string;
  description: string;
  status: 'pending' | 'completed';
  dueDate: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  category: GoalCategory;
  description: string;
  timeframe: string;
  progress: number; // 0-100
  createdAt: string;
  milestones: Milestone[];
  tags?: string[];
  isCompleted?: boolean;
  completedAt?: string;
}

export interface TaskList {
  id: string;
  userId: string;
  title: string;
  isDefault?: boolean;
}

export interface Task {
  id: string;
  userId: string;
  listId: string; // Foreign Key to TaskList
  linkedGoalId?: string; // Foreign Key to Goal (optional)
  title: string;
  details?: string;
  dueDate?: string;
  status: 'pending' | 'completed';
  completedAt?: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  userId: string;
  title: string;
  description: string;
  classification: AchievementType;
  summary: string;
  project: string;
  date: string;
  evidenceUrl?: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  streakCount: number;
  lastLoggedDate: string; // YYYY-MM-DD
  history: string[]; // List of YYYY-MM-DD dates completed
}

export interface ReportConfig {
  type: 'Weekly' | 'Monthly' | 'Quarterly';
  tone: 'Manager-ready' | 'Casual' | 'Concise';
  goalIds: string[];
  startDate: string;
  endDate: string;
}

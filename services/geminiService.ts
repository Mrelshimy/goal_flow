
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Achievement, Goal, Milestone, AchievementType, Task } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is not set in environment variables.");
    throw new Error("Missing API Key");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateSmartGoal = async (rawText: string): Promise<string> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Rewrite the following goal to be SMART (Specific, Measurable, Achievable, Relevant, Time-bound). 
      Return only the rewritten goal description text, no explanations.
      
      Original Goal: "${rawText}"`,
    });
    return response.text?.trim() || rawText;
  } catch (error) {
    console.error("Error generating SMART goal:", error);
    return rawText;
  }
};

export const generateMilestones = async (goalText: string, timeframe: string): Promise<Omit<Milestone, 'id' | 'goalId'>[]> => {
  const ai = getAIClient();
  
  const milestoneSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING },
        status: { type: Type.STRING, enum: ['pending'] },
        dueDate: { type: Type.STRING, description: "YYYY-MM-DD format" }
      },
      required: ['description', 'status', 'dueDate']
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 3 to 5 key milestones for the goal: "${goalText}" which needs to be completed by ${timeframe}. 
      Ensure deadlines are spaced out logically.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: milestoneSchema,
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating milestones:", error);
    return [];
  }
};

export const classifyAndSummarizeAchievement = async (
  title: string, 
  description: string
): Promise<{ classification: AchievementType; summary: string }> => {
  const ai = getAIClient();
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      classification: { 
        type: Type.STRING, 
        enum: ['Leadership', 'Delivery', 'Communication', 'Impact', 'Other'] 
      },
      summary: { type: Type.STRING }
    },
    required: ['classification', 'summary']
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze this professional achievement.
      1. Classify it into one of: Leadership, Delivery, Communication, Impact, Other.
      2. Write a 1-sentence executive summary suitable for a performance review (manager-ready tone).
      
      Title: ${title}
      Description: ${description}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error classifying achievement:", error);
    return { classification: AchievementType.OTHER, summary: description };
  }
};

export const generateReport = async (
  startDate: string,
  endDate: string,
  goals: Goal[],
  achievements: Achievement[],
  tasks: Task[],
  tone: string,
  type: string
): Promise<string> => {
  const ai = getAIClient();
  
  const relevantGoals = goals.map(g => `${g.title} (${g.progress}% complete)`).join('; ');
  const relevantAchievements = achievements.map(a => `- ${a.title} (${a.classification}): ${a.summary}`).join('\n');
  const relevantTasks = tasks
    .filter(t => t.status === 'completed' && t.completedAt && t.completedAt >= startDate && t.completedAt <= endDate)
    .map(t => `- [Completed Task] ${t.title}`)
    .join('\n');

  const prompt = `Write a ${type} Professional Performance Report.
  Date Range: ${startDate} to ${endDate}
  Tone: ${tone}
  
  Key Goals Context:
  ${relevantGoals}
  
  Achievements Logged:
  ${relevantAchievements}

  Completed Tasks (Ad-hoc items):
  ${relevantTasks}
  
  Structure the report with these Markdown headers:
  ## Executive Summary
  ## Key Achievements
  ## Operational Execution (Tasks & Milestones)
  ## Progress on Goals
  ## Focus for Next Period
  
  Keep it professional and actionable.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
    });
    return response.text || "Could not generate report.";
  } catch (error) {
    console.error("Error generating report:", error);
    return "Error generating report. Please check your API key and try again.";
  }
};

export const generateReflection = async (habits: any[], goals: Goal[]): Promise<string> => {
  const ai = getAIClient();
  const habitSummary = habits.map(h => `${h.name}: Streak ${h.streakCount}`).join(', ');
  const goalSummary = goals.map(g => `${g.title} is ${g.progress}% done`).join(', ');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, encouraging monthly reflection for a user based on this data:
      Habits: ${habitSummary}
      Goals: ${goalSummary}
      
      Give 3 bullet points on what went well and 1 suggestion for improvement.`,
    });
    return response.text || "Keep pushing forward!";
  } catch (error) {
    return "Great job staying consistent! Keep tracking to see AI insights.";
  }
};

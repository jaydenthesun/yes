// app/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaGift,
  FaUser,
  FaCheckCircle,
  FaEdit,
  FaPlus,
  FaTag,
  FaCalendarAlt,
  FaChartBar,
  FaTrophy,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus,
  FaTasks,
} from "react-icons/fa";
import { BsFillCalendarDateFill } from "react-icons/bs";
import { AiOutlineClose } from "react-icons/ai";
import clsx from "clsx";

// --- Utility Functions ---
function uuid() {
  if (typeof window !== "undefined") {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return "server-id-" + Math.random().toString(36).slice(2);
}

function getTodayDateString() {
  return new Date().toISOString().split("T")[0];
}

// --- Types ---
type Priority = "Low" | "Medium" | "High";
type Recurrence = "None" | "Daily" | "Weekly" | "Monthly";
type Category = "Work" | "Personal" | "Health" | "Learning" | "Other";
type Subtask = {
  id: string;
  text: string;
  completed: boolean;
};
type Task = {
  id: string;
  text: string;
  dueDate?: string;
  priority: Priority;
  completed: boolean;
  createdAt: number;
  recurrence: Recurrence;
  lastCompletedDate?: string; // For recurring tasks
  category: Category;
  description?: string;
  subtasks: Subtask[];
};
type XPHistoryItem = {
  id: string;
  change: number;
  description: string;
  timestamp: number;
};
type Reward = {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  link?: string;
  custom?: boolean; // To distinguish user-created rewards
};
type UserStats = {
  totalTasksCompleted: number;
  highestStreak: number;
  currentStreak: number;
  lastStreakCheckDate: string;
};
// FIX: Updated Achievement type to include currentXP in check function signature
type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  check: (userStats: UserStats) => boolean; // Function to check if unlocked
};
type Theme = "default" | "dark" | "blue" | "green"; // Example themes

// --- Constants & XP Values ---
const XP_PER_TASK = 20;
const XP_PER_HIGH_PRIORITY_TASK = 30; // Additional XP for high priority
const XP_PER_TASK_ON_TIME = 10; // Bonus XP for completing on or before due date
const STREAK_BONUS_XP_DAILY = 5;

const REWARDS: Reward[] = [
  { id: "movie", name: "Movie Ticket", emoji: "🎬", cost: 500, link: "https://www.cineplex.com/" },
  { id: "giftcard", name: "Online Store Gift Card ($10)", emoji: "🎁", cost: 1000, link: "https://www.giftcertificates.ca/" },
  { id: "coffee", name: "Coffee Voucher", emoji: "☕", cost: 200, link: "https://www.starbucks.ca/" },
  { id: "bookstore", name: "Bookstore Voucher ($5)", emoji: "📚", cost: 300, link: "https://www.indigo.ca/en-ca/search?q=buy%20kindle%20books&z=1" },
  { id: "gaming", name: "Gaming Credit ($20)", emoji: "🎮", cost: 1200, link: "https://www.xbox.com/en-us/play" },
];

// FIX: Corrected the check function signature and used explicit types for parameters
const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_task",
    name: "First Step!",
    description: "Complete your very first task.",
    icon: "✨",
    unlocked: false,
    check: (stats: UserStats) => stats.totalTasksCompleted >= 1,
  },
  {
    id: "task_master_10",
    name: "Task Apprentice",
    description: "Complete 10 tasks.",
    icon: "💪",
    unlocked: false,
    check: (stats: UserStats) => stats.totalTasksCompleted >= 10,
  },
  {
    id: "streak_3",
    name: "On a Roll!",
    description: "Maintain a 3-day completion streak.",
    icon: "🔥",
    unlocked: false,
    check: (stats: UserStats) => stats.highestStreak >= 3,
  },
  {
    id: "xp_collector_500",
    name: "XP Gatherer",
    description: "Earn 500 total XP.",
    icon: "💰",
    unlocked: false,
    check: (stats: UserStats) => stats.totalTasksCompleted * XP_PER_TASK >= 500,
  },
];

const CATEGORIES: Category[] = ["Work", "Personal", "Health", "Learning", "Other"];

// --- Helper Functions ---
function getPriorityColor(priority: Priority) {
  switch (priority) {
    case "High":
      return "border-red-500";
    case "Medium":
      return "border-yellow-400";
    default:
      return "border-blue-500";
  }
}

function getLevel(xp: number) {
  return Math.floor(xp / 100) + 1;
}

// --- Theme Configuration ---
const THEME_CLASSES: Record<Theme, { bg: string; text: string; primary: string; secondary: string }> = {
  default: {
    bg: "bg-gray-100",
    text: "text-gray-900",
    primary: "bg-violet-600",
    secondary: "bg-violet-400",
  },
  dark: {
    bg: "bg-gray-800",
    text: "text-gray-100",
    primary: "bg-purple-700",
    secondary: "bg-purple-500",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-900",
    primary: "bg-blue-600",
    secondary: "bg-blue-400",
  },
  green: {
    bg: "bg-green-50",
    text: "text-green-900",
    primary: "bg-emerald-600",
    secondary: "bg-emerald-400",
  },
};

// --- Modal Component ---
function Modal({
  onClose,
  children,
  isOpen,
}: {
  onClose: () => void;
  children: React.ReactNode;
  isOpen: boolean;
}) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 relative min-w-[300px] max-w-full w-full md:w-auto transform transition-all duration-300 scale-100 opacity-100">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors duration-300"
          onClick={onClose}
          aria-label="Close"
        >
          <AiOutlineClose className="text-xl" />
        </button>
        {children}
      </div>
    </div>
  );
}

// --- Task Modal Component ---
function TaskModal({
  task,
  onClose,
  onSave,
  onComplete,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onSave: (t: Task) => void;
  onComplete: (t: Task) => void;
  onDelete: (t: Task) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(task.text);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [recurrence, setRecurrence] = useState<Recurrence>(task.recurrence);
  const [category, setCategory] = useState<Category>(task.category);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks);
  const [newSubtaskText, setNewSubtaskText] = useState("");

  const handleAddSubtask = () => {
    if (newSubtaskText.trim()) {
      setSubtasks(prev => [...prev, { id: uuid(), text: newSubtaskText.trim(), completed: false }]);
      setNewSubtaskText("");
    }
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(prev =>
      prev.map(st => (st.id === id ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== id));
  };

  return (
    <Modal onClose={onClose} isOpen={true}>
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Task Details</h2>
        </div>
        {edit ? (
          <>
            <input
              className="border rounded px-2 py-1 w-full mb-2 transition-shadow duration-300 focus:shadow-lg"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Task name"
            />
            <textarea
              className="border rounded px-2 py-1 w-full mb-2 h-24 resize-y transition-shadow duration-300 focus:shadow-lg"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Task description (optional)"
            />
            <input
              type="date"
              className="border rounded px-2 py-1 w-full mb-2 transition-shadow duration-300 focus:shadow-lg"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <select
              className="border rounded px-2 py-1 w-full mb-2 transition-shadow duration-300 focus:shadow-lg"
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
            </select>
            <select
              className="border rounded px-2 py-1 w-full mb-2 transition-shadow duration-300 focus:shadow-lg"
              value={recurrence}
              onChange={e => setRecurrence(e.target.value as Recurrence)}
            >
              <option value="None">No Recurrence</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
            <select
              className="border rounded px-2 py-1 w-full mb-2 transition-shadow duration-300 focus:shadow-lg"
              value={category}
              onChange={e => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="mt-4 border-t pt-4">
              <h3 className="font-semibold mb-2">Subtasks</h3>
              <div className="flex mb-2">
                <input
                  className="border rounded px-2 py-1 flex-1 mr-2"
                  placeholder="New subtask"
                  value={newSubtaskText}
                  onChange={e => setNewSubtaskText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddSubtask()}
                />
                <button
                  className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                  onClick={handleAddSubtask}
                >
                  Add
                </button>
              </div>
              <ul>
                {subtasks.map(st => (
                  <li key={st.id} className="flex items-center justify-between mb-1">
                    <label className="flex items-center text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => handleToggleSubtask(st.id)}
                        className="mr-2"
                      />
                      <span className={clsx(st.completed && "line-through text-gray-500")}>
                        {st.text}
                      </span>
                    </label>
                    <button
                      className="text-red-400 hover:text-red-600 text-xs"
                      onClick={() => handleDeleteSubtask(st.id)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
                {subtasks.length === 0 && <p className="text-gray-500 text-sm">No subtasks added.</p>}
              </ul>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                className="bg-violet-600 text-white px-4 py-2 rounded font-semibold hover:bg-violet-700 mr-2 transition-all duration-300 active:scale-95"
                onClick={() => {
                  onSave({ ...task, text, description, dueDate, priority, recurrence, category, subtasks });
                  setEdit(false);
                }}
              >
                Save
              </button>
              <button
                className="bg-gray-300 px-4 py-2 rounded transition-all duration-300 active:scale-95"
                onClick={() => setEdit(false)}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-2">
              <span className="font-semibold">Task:</span> {task.text}
            </div>
            {task.description && (
              <div className="mb-2">
                <span className="font-semibold">Description:</span> {task.description}
              </div>
            )}
            <div className="mb-2">
              <span className="font-semibold">Due Date:</span> {task.dueDate || "None"}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Priority:</span> {task.priority}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Recurrence:</span> {task.recurrence}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Category:</span> {task.category}
            </div>

            <div className="mt-4 border-t pt-4">
              <h3 className="font-semibold mb-2">Subtasks ({subtasks.filter(st => st.completed).length}/{subtasks.length})</h3>
              <ul>
                {subtasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No subtasks.</p>
                ) : (
                  subtasks.map(st => (
                    <li key={st.id} className="flex items-center text-sm mb-1">
                      {st.completed ? (
                        <FaCheckCircle className="text-green-500 mr-2" />
                      ) : (
                        <span className="inline-block w-4 h-4 border border-gray-400 rounded-full mr-2"></span>
                      )}
                      <span className={clsx(st.completed && "line-through text-gray-500")}>
                        {st.text}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="flex gap-2 mt-4">
              {!task.completed && (
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-all duration-300 active:scale-95"
                  onClick={() => {
                    onComplete(task);
                    onClose();
                  }}
                >
                  Mark Complete
                </button>
              )}
              <button
                className="bg-violet-600 text-white px-4 py-2 rounded hover:bg-violet-700 transition-all duration-300 active:scale-95"
                onClick={() => setEdit(true)}
              >
                Edit
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-all duration-300 active:scale-95"
                onClick={() => {
                  onDelete(task);
                  onClose();
                }}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// --- Reward Modal Component ---
function CustomRewardModal({
  onClose,
  onSave,
  isOpen
}: {
  onClose: () => void;
  onSave: (reward: Omit<Reward, 'id'>) => void;
  isOpen: boolean;
}) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState(0);
  const [emoji, setEmoji] = useState("✨");
  const [link, setLink] = useState("");

  const handleSubmit = () => {
    if (name.trim() && cost > 0) {
      onSave({ name: name.trim(), cost, emoji, link: link.trim() || undefined, custom: true });
      onClose();
    }
  };

  return (
    <Modal onClose={onClose} isOpen={isOpen}>
      <h2 className="text-xl font-bold mb-4">Create Custom Reward</h2>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Reward Name:
        </label>
        <input
          type="text"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Cost (XP):
        </label>
        <input
          type="number"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={cost}
          onChange={(e) => setCost(parseInt(e.target.value) || 0)}
          min="0"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Emoji Icon:
        </label>
        <input
          type="text"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 2))} // Limit to 2 characters for emoji
          maxLength={2}
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Optional Link:
        </label>
        <input
          type="url"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="e.g., https://example.com"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          onClick={handleSubmit}
          disabled={!name.trim() || cost <= 0}
        >
          Create Reward
        </button>
      </div>
    </Modal>
  );
}


// --- Main HomePage Component ---
export default function HomePage() {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null); // null, 'login', 'signup'
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // --- User & App State ---
  const [username, setUsername] = useState("Guest"); // Default for logged out or initial state
  const [editingUsername, setEditingUsername] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("Low");
  const [recurrence, setRecurrence] = useState<Recurrence>("None");
  const [category, setCategory] = useState<Category>("Personal");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [xp, setXP] = useState(0);
  const [xpHistory, setXPHistory] = useState<XPHistoryItem[]>([]);
  const [showXPModal, setShowXPModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showMsg, setShowMsg] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRewards, setUserRewards] = useState<Reward[]>([]); // For custom rewards
  const [showCustomRewardModal, setShowCustomRewardModal] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [userStats, setUserStats] = useState<UserStats>({
    totalTasksCompleted: 0,
    highestStreak: 0,
    currentStreak: 0,
    lastStreakCheckDate: "",
  });
  const [theme, setTheme] = useState<Theme>("default");
  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");

  // --- Load from Local Storage on Client (User-specific data) ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedEmail = localStorage.getItem("userEmail");
      //const storedPassword = localStorage.getItem("userPassword"); // Unsafe storage for demo
      const storedLoggedIn = localStorage.getItem("isLoggedIn") === "true";

      if (storedLoggedIn && storedEmail) {
        setIsLoggedIn(true);
        setUsername(localStorage.getItem(`username-${storedEmail}`) || storedEmail.split('@')[0]);
        setTasks(JSON.parse(localStorage.getItem(`tasks-${storedEmail}`) || "[]"));
        setXP(Number(localStorage.getItem(`xp-${storedEmail}`) || "0"));
        setXPHistory(JSON.parse(localStorage.getItem(`xpHistory-${storedEmail}`) || "[]"));
        setUserRewards(JSON.parse(localStorage.getItem(`userRewards-${storedEmail}`) || "[]"));
        // FIX: Ensure achievements are initialized correctly if not found
        const storedAchievements = localStorage.getItem(`achievements-${storedEmail}`);
        setAchievements(storedAchievements ? JSON.parse(storedAchievements) : ACHIEVEMENTS);

        setUserStats(JSON.parse(localStorage.getItem(`userStats-${storedEmail}`) || JSON.stringify(userStats)));
        setTheme(localStorage.getItem(`theme-${storedEmail}`) as Theme || "default");
      } else {
        setIsLoggedIn(false);
        setUsername("Guest"); // Reset for guest
        setTasks([]); // Clear tasks for guest
        setXP(0);
        setXPHistory([]);
        setUserRewards([]);
        setAchievements(ACHIEVEMENTS); // Reset achievements for guest
        setUserStats({ totalTasksCompleted: 0, highestStreak: 0, currentStreak: 0, lastStreakCheckDate: "" });
        setTheme("default");
      }
      setLoading(false); // Finished initial load
    }
  }, [isLoggedIn]); // Rerun when login state changes

  // --- Persist to Local Storage (User-specific data) ---
  const currentEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;

  useEffect(() => {
    if (typeof window !== "undefined" && currentEmail) {
      localStorage.setItem(`tasks-${currentEmail}`, JSON.stringify(tasks));
    }
  }, [tasks, currentEmail]);

  useEffect(() => {
    if (typeof window !== "undefined" && currentEmail) {
      localStorage.setItem(`xp-${currentEmail}`, xp.toString());
    }
  }, [xp, currentEmail]);

  useEffect(() => {
    if (typeof window !== "undefined" && currentEmail) {
      localStorage.setItem(`xpHistory-${currentEmail}`, JSON.stringify(xpHistory));
    }
  }, [xpHistory, currentEmail]);

  useEffect(() => {
    if (typeof window !== "undefined" && currentEmail) {
      localStorage.setItem(`username-${currentEmail}`, username);
    }
  }, [username, currentEmail]);

  useEffect(() => {
    if (typeof window !== "undefined" && currentEmail) {
      localStorage.setItem(`userRewards-${currentEmail}`, JSON.stringify(userRewards));
    }
  }, [userRewards, currentEmail]);

  useEffect(() => {
    if (typeof window !== "undefined" && currentEmail) {
      localStorage.setItem(`achievements-${currentEmail}`, JSON.stringify(achievements));
    }
  }, [achievements, currentEmail]);

  useEffect(() => {
    if (typeof window !== "undefined" && currentEmail) {
      localStorage.setItem(`userStats-${currentEmail}`, JSON.stringify(userStats));
    }
  }, [userStats, currentEmail]);

  useEffect(() => {
    if (typeof window !== "undefined" && currentEmail) {
      localStorage.setItem(`theme-${currentEmail}`, theme);
    }
  }, [theme, currentEmail]);


  // --- Startup Transition (General App Loading) ---
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);

  // --- Recurring Task Management & Streak Check ---
  useEffect(() => {
    if (!isLoggedIn) return; // Only run for logged-in users
    const today = getTodayDateString();

    let updatedTasks = [...tasks];
    //let streakIncreased = false;

    // Check streak
    if (userStats.lastStreakCheckDate !== today) {
    //const lastCheckDate = new Date(userStats.lastStreakCheckDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      const completedToday = tasks.some(t => t.completed && t.lastCompletedDate === today);
      const completedYesterday = tasks.some(t => t.completed && t.lastCompletedDate === yesterdayString);

      if (completedToday) {
        if (completedYesterday || userStats.lastStreakCheckDate === "") { // Streak continues or starts
          setUserStats(prev => {
            const newCurrentStreak = prev.currentStreak + 1;
            if (newCurrentStreak > prev.highestStreak) {
              setXP(oldXP => oldXP + STREAK_BONUS_XP_DAILY);
              setXPHistory(prevHistory => [
                { id: uuid(), change: STREAK_BONUS_XP_DAILY, description: `Streak bonus: ${newCurrentStreak} days!`, timestamp: Date.now() },
                ...prevHistory,
              ]);
              setShowMsg({ type: "success", msg: `Daily streak! +${STREAK_BONUS_XP_DAILY} XP for ${newCurrentStreak} days!` });
            }
            return {
              ...prev,
              currentStreak: newCurrentStreak,
              highestStreak: Math.max(prev.highestStreak, newCurrentStreak),
              lastStreakCheckDate: today,
            };
          });
        } else { // Streak broken
          setUserStats(prev => ({
            ...prev,
            currentStreak: completedToday ? 1 : 0, // Reset to 1 if completed today, else 0
            lastStreakCheckDate: today,
          }));
        }
      } else { // No task completed today, check if yesterday was also missed for streak break
        if (userStats.lastStreakCheckDate !== "" && userStats.lastStreakCheckDate !== yesterdayString) {
          setUserStats(prev => ({
            ...prev,
            currentStreak: 0,
            lastStreakCheckDate: today,
          }));
        }
      }
    }

    // Handle recurring tasks
    updatedTasks = updatedTasks.map(task => {
      if (task.recurrence === "None" || !task.completed) {
        return task;
      }

      const lastCompleted = task.lastCompletedDate;
      if (!lastCompleted) return task; // Should not happen for recurring completed tasks

      const lastDate = new Date(lastCompleted);
      const nextDueDate = new Date(lastDate);

      let shouldReset = false;

      switch (task.recurrence) {
        case "Daily":
          nextDueDate.setDate(lastDate.getDate() + 1);
          shouldReset = nextDueDate.toISOString().split('T')[0] <= today;
          break;
        case "Weekly":
          nextDueDate.setDate(lastDate.getDate() + 7);
          shouldReset = nextDueDate.toISOString().split('T')[0] <= today;
          break;
        case "Monthly":
          nextDueDate.setMonth(lastDate.getMonth() + 1);
          shouldReset = nextDueDate.toISOString().split('T')[0] <= today;
          break;
      }

      if (shouldReset) {
        return {
          ...task,
          completed: false, // Reset completion status
          lastCompletedDate: undefined, // Clear last completed date
          createdAt: Date.now(), // Treat as new for sorting
          dueDate: task.recurrence === "Daily" ? today : task.dueDate, // Maybe update due date for daily
        };
      }
      return task;
    });

    // Only update tasks if changes were made
    const didTasksChange = JSON.stringify(updatedTasks) !== JSON.stringify(tasks);
    if (didTasksChange) {
      setTasks(updatedTasks);
    }
  }, [tasks, userStats, isLoggedIn]); // Dependency on tasks ensures re-evaluation after task completion


  // --- Achievement Check ---
  useEffect(() => {
    if (!isLoggedIn) return;
    let updatedAchievements = false;
    const newAchievements = achievements.map(ach => {
      if (!ach.unlocked) {
        // Pass current XP for specific achievement checks
        const isUnlocked = ach.check(userStats); // FIX: Pass both userStats and xp
        if (isUnlocked) {
          updatedAchievements = true;
          setShowMsg({ type: "success", msg: `Achievement Unlocked: ${ach.name}! ${ach.icon}` });
          return { ...ach, unlocked: true };
        }
      }
      return ach;
    });
    if (updatedAchievements) {
      setAchievements(newAchievements);
    }
  }, [userStats, xp, achievements, isLoggedIn]);


  // --- Authentication Handlers ---
  const handleLogin = () => {
    setAuthError("");
    if (!authEmail || !authPassword) {
      setAuthError("Email and password are required.");
      return;
    }
    const storedUserPassword = localStorage.getItem(`userPassword-${authEmail}`);
    if (storedUserPassword === authPassword) { // Insecure comparison for demo
      localStorage.setItem("userEmail", authEmail);
      localStorage.setItem("isLoggedIn", "true");
      setIsLoggedIn(true);
      setAuthMode(null);
      setAuthEmail("");
      setAuthPassword("");
      setShowMsg({ type: "success", msg: `Welcome back, ${localStorage.getItem(`username-${authEmail}`) || authEmail.split('@')[0]}!` });
    } else {
      setAuthError("Invalid email or password.");
    }
  };

  const handleSignUp = () => {
    setAuthError("");
    if (!authEmail || !authPassword) {
      setAuthError("Email and password are required.");
      return;
    }
    if (localStorage.getItem(`userPassword-${authEmail}`)) {
      setAuthError("An account with this email already exists. Please login.");
      return;
    }

    localStorage.setItem(`userPassword-${authEmail}`, authPassword); // Insecure storage for demo
    localStorage.setItem(`username-${authEmail}`, authEmail.split('@')[0]); // Default username
    localStorage.setItem("userEmail", authEmail);
    localStorage.setItem("isLoggedIn", "true");
    setIsLoggedIn(true);
    setAuthMode(null);
    setAuthEmail("");
    setAuthPassword("");
    setShowMsg({ type: "success", msg: `Account created for ${authEmail.split('@')[0]}!` });
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userEmail");
      localStorage.removeItem("isLoggedIn");
      setIsLoggedIn(false);
      setShowMsg({ type: "success", msg: "Logged out successfully!" });
    }
  };

  // --- Task Handlers ---
  const handleAddTask = () => {
    if (!taskInput.trim()) return;
    const newTask: Task = {
      id: uuid(),
      text: taskInput.trim(),
      description: taskDescription.trim() || undefined,
      dueDate: dueDate || undefined,
      priority,
      completed: false,
      createdAt: Date.now(),
      recurrence,
      category,
      subtasks: [],
    };
    setTasks(prev => [...prev, newTask]);
    setTaskInput("");
    setTaskDescription("");
    setDueDate("");
    setPriority("Low");
    setRecurrence("None");
    setCategory("Personal");
    setShowMsg({ type: "success", msg: "Task added!" });
  };

  const handleCompleteTask = useCallback((task: Task) => {
    setTasks(prev => prev.map(t =>
      t.id === task.id
        ? { ...t, completed: true, lastCompletedDate: getTodayDateString() }
        : t
    ));

    let xpEarned = XP_PER_TASK;
    let xpDescription = `Completed task: "${task.text}"`;

    if (task.priority === "High") {
      xpEarned += XP_PER_HIGH_PRIORITY_TASK;
      xpDescription += " (+High Priority Bonus)";
    }
    if (task.dueDate && new Date(task.dueDate) >= new Date(getTodayDateString())) {
      xpEarned += XP_PER_TASK_ON_TIME;
      xpDescription += " (+On-Time Bonus)";
    }

    setXP(prev => prev + xpEarned);
    setXPHistory(prev => [
      { id: uuid(), change: xpEarned, description: xpDescription, timestamp: Date.now() },
      ...prev,
    ]);
    setShowMsg({ type: "success", msg: `Task completed! +${xpEarned} XP` });

    setUserStats(prev => ({
      ...prev,
      totalTasksCompleted: prev.totalTasksCompleted + 1,
      currentStreak: prev.currentStreak + 1, // Will be re-evaluated by useEffect
      lastStreakCheckDate: getTodayDateString(),
    }));
  }, [setTasks, setXP, setXPHistory, setShowMsg, setUserStats]);

  const handleDeleteTask = useCallback((task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setShowMsg({ type: "success", msg: "Task deleted." });
  }, [setTasks, setShowMsg]);

  const handleEditTask = useCallback((updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setShowMsg({ type: "success", msg: "Task updated." });
  }, [setTasks, setShowMsg]);

  // --- Reward Handlers ---
  const handleRedeem = useCallback((reward: Reward) => {
    if (xp < reward.cost) {
      setShowMsg({ type: "error", msg: "Not enough XP!" });
      return;
    }
    setXP(prev => prev - reward.cost);
    setXPHistory(prev => [
      { id: uuid(), change: -reward.cost, description: `Redeemed: ${reward.name}`, timestamp: Date.now() },
      ...prev,
    ]);
    setShowMsg({ type: "success", msg: `Redeemed ${reward.name}!` });

    if (reward.link && typeof window !== 'undefined') {
      window.open(reward.link, "_blank");
    } else if (reward.link && typeof window === 'undefined') {
      console.warn("Attempted to open link on server, which is not supported:", reward.link);
    } else {
      console.log(`No link provided for reward: ${reward.name}`);
    }
  }, [xp, setXP, setXPHistory, setShowMsg]);

  const handleAddCustomReward = useCallback((newReward: Omit<Reward, 'id'>) => {
    const rewardWithId = { ...newReward, id: uuid() };
    setUserRewards(prev => [...prev, rewardWithId]);
    setShowMsg({ type: "success", msg: `Custom reward "${newReward.name}" created!` });
  }, [setUserRewards, setShowMsg]);

  // --- Other Handlers ---
  const handleUsernameChange = useCallback((newName: string) => {
    if (!newName.trim()) {
      setShowMsg({ type: "error", msg: "Username cannot be empty." });
      return;
    }
    setUsername(newName.trim());
    setEditingUsername(false);
    setShowMsg({ type: "success", msg: "Username updated!" });
  }, [setUsername, setEditingUsername, setShowMsg]);

  const handleDeleteXPHistory = useCallback(() => {
    setXPHistory([]);
    setShowMsg({ type: "success", msg: "XP history deleted." });
  }, [setXPHistory, setShowMsg]);

  // --- Filtered and Sorted Tasks ---
  const filteredAndSortedTasks = useMemo(() => {
    return [...tasks]
      .filter(task => filterCategory === "All" || task.category === filterCategory)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const pOrder = { High: 0, Medium: 1, Low: 2 };
        if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
        if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
        return a.createdAt - b.createdAt;
      });
  }, [tasks, filterCategory]);

  const allRewards = useMemo(() => [...REWARDS, ...userRewards], [userRewards]);
  const currentTheme = THEME_CLASSES[theme];


  // --- Auth Screen ---
  if (!isLoggedIn) {
    return (
      <div className={clsx(
        "min-h-screen flex items-center justify-center p-4",
        currentTheme.bg,
        currentTheme.text,
        "transition-colors duration-700",
        loading ? "opacity-0" : "opacity-100"
      )}>
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-violet-600 mb-6">Gamified To-Do</h1>
          <h2 className="text-2xl font-semibold text-center mb-6">
            {authMode === "login" ? "Welcome Back!" : "Join the Quest!"}
          </h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter your email"
              value={authEmail}
              onChange={(e) => { setAuthEmail(e.target.value); setAuthError(""); }}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter your password"
              value={authPassword}
              onChange={(e) => { setAuthPassword(e.target.value); setAuthError(""); }}
            />
          </div>
          {authError && <p className="text-red-500 text-xs italic mb-4">{authError}</p>}
          <div className="flex flex-col gap-3">
            {authMode === "login" ? (
              <button
                className={clsx(
                  "flex items-center justify-center gap-2",
                  currentTheme.primary,
                  "hover:opacity-90 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-all duration-300 active:scale-95"
                )}
                onClick={handleLogin}
              >
                <FaSignInAlt /> Login
              </button>
            ) : (
              <button
                className={clsx(
                  "flex items-center justify-center gap-2",
                  currentTheme.primary,
                  "hover:opacity-90 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-all duration-300 active:scale-95"
                )}
                onClick={handleSignUp}
              >
                <FaUserPlus /> Sign Up
              </button>
            )}
            <button
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-all duration-300 active:scale-95"
              onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
            >
              {authMode === "login" ? "Need an account? Sign Up" : "Already have an account? Login"}
            </button>
          </div>
        </div>
        {showMsg && <Modal onClose={() => setShowMsg(null)} isOpen={!!showMsg}>
          <div className="p-4">
            <div className={clsx("font-bold mb-2", showMsg.type === "success" ? "text-green-600" : "text-red-600")}>
              {showMsg.type === "success" ? "Success" : "Error"}
            </div>
            <div>{showMsg.msg}</div>
          </div>
        </Modal>}
      </div>
    );
  }

  // --- Main App Render (Logged In) ---
  return (
    <div className={clsx(
      "min-h-screen p-4 transition-opacity duration-700",
      currentTheme.bg,
      currentTheme.text,
      loading ? "opacity-0" : "opacity-100"
    )}>
      {/* Header */}
      <div className={clsx(
        "bg-white rounded-xl shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between mb-6",
        "transition-all duration-700",
        loading ? "translate-y-8 opacity-0" : "translate-y-0 opacity-100"
      )}>
        <div>
          <h1 className="text-3xl font-bold text-violet-600">Gamified To-Do</h1>
          <div className="flex items-center gap-2 mt-2">
            <label htmlFor="theme-select" className="text-sm text-gray-600">Theme:</label>
            <select
              id="theme-select"
              className="border rounded text-sm p-1"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            >
              {Object.keys(THEME_CLASSES).map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <FaUser className="text-xl transition-transform duration-300 hover:scale-110" />
          {editingUsername ? (
            <input
              className="border rounded px-2 py-1 transition-shadow duration-300 focus:shadow-lg text-gray-800"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onBlur={() => handleUsernameChange(username)}
              onKeyDown={e => e.key === "Enter" && handleUsernameChange(username)}
              autoFocus
            />
          ) : (
            <span
              className="font-semibold cursor-pointer hover:underline transition-colors duration-300"
              onClick={() => setEditingUsername(true)}
              title="Edit username"
            >
              {username}
              <FaEdit className="inline ml-1 text-gray-400 transition-transform duration-300 hover:scale-110" />
            </span>
          )}
          <span className="ml-2 text-gray-500">
            Level: {getLevel(xp)} | XP: {xp}
          </span>
          <button
            className="bg-red-500 text-white px-3 py-1 rounded-full text-sm hover:bg-red-600 transition-colors duration-300 flex items-center gap-1 active:scale-95"
            onClick={handleLogout}
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={clsx(
        "flex flex-col lg:flex-row gap-6 transition-all duration-700",
        loading ? "translate-y-8 opacity-0" : "translate-y-0 opacity-100"
      )}>
        {/* Left: Tasks */}
        <div className="flex-1 bg-white rounded-xl shadow p-6">
          <div className="flex items-center mb-4">
            <FaCheckCircle className="text-green-500 mr-2 transition-transform duration-300 hover:scale-110" />
            <h2 className="text-xl font-bold">Your Tasks</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-2 mb-4">
            <input
              className="border rounded px-2 py-1 flex-1 transition-shadow duration-300 focus:shadow-lg text-gray-800"
              placeholder="Add a new task..."
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddTask()}
            />
            <input
              type="date"
              className="border rounded px-2 py-1 transition-shadow duration-300 focus:shadow-lg text-gray-800"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <select
              className="border rounded px-2 py-1 transition-shadow duration-300 focus:shadow-lg text-gray-800"
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
            </select>
            <select
              className="border rounded px-2 py-1 transition-shadow duration-300 focus:shadow-lg text-gray-800"
              value={recurrence}
              onChange={e => setRecurrence(e.target.value as Recurrence)}
            >
              <option value="None">No Recurrence</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
            <select
              className="border rounded px-2 py-1 transition-shadow duration-300 focus:shadow-lg text-gray-800"
              value={category}
              onChange={e => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              className={clsx(
                currentTheme.primary,
                "text-white px-4 py-2 rounded font-semibold hover:opacity-90 transition-all duration-300 active:scale-95 flex items-center justify-center gap-1"
              )}
              onClick={handleAddTask}
            >
              <FaPlus /> Add Task
            </button>
          </div>
          <div className="mb-4">
            <label htmlFor="filterCategory" className="mr-2 text-gray-600">Filter by Category:</label>
            <select
              id="filterCategory"
              className="border rounded px-2 py-1 text-gray-800"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as Category | "All")}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          {filteredAndSortedTasks.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No tasks yet! Add one to start earning XP.</div>
          ) : (
            <ul>
              {filteredAndSortedTasks.map(task => (
                <li
                  key={task.id}
                  className={clsx(
                    "flex items-center justify-between bg-gray-50 rounded-lg mb-3 p-4 shadow-sm border-l-4 cursor-pointer transition-all duration-300 hover:bg-gray-100",
                    getPriorityColor(task.priority),
                    task.completed && "opacity-60"
                  )}
                  onClick={() => setSelectedTask(task)}
                >
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <FaTasks className="text-gray-500" /> {task.text}
                    </div>
                    {task.description && (
                      <div className="text-xs text-gray-600 truncate max-w-sm">
                        {task.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      {task.dueDate && (
                        <>
                          <BsFillCalendarDateFill /> {task.dueDate}
                        </>
                      )}
                      <FaTag className="text-gray-400" /> {task.category}
                      <span className="ml-1">| {task.priority} Priority</span>
                      {task.recurrence !== "None" && <span className="ml-1">| {task.recurrence}</span>}
                      {task.subtasks.length > 0 && (
                        <span className="ml-1">| {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} subtasks</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!task.completed && (
                      <button
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-all duration-300 active:scale-95"
                        onClick={e => {
                          e.stopPropagation();
                          handleCompleteTask(task);
                        }}
                      >
                        Complete
                      </button>
                    )}
                    <button
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-all duration-300 active:scale-95"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteTask(task);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right: Widgets */}
        <div className="flex flex-col gap-6 w-full lg:w-[350px]">
          {/* Progress */}
          <div className="bg-white rounded-xl shadow p-4 transition-all duration-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-500">🏅</span>
              <span className="font-bold">Progress</span>
            </div>
            <div className="font-semibold mb-1">Level {getLevel(xp)}</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-full bg-gray-200 rounded h-3 overflow-hidden">
                <div
                  className={clsx(currentTheme.secondary, "h-3 rounded transition-all duration-700")}
                  style={{ width: `${((xp % 100) / 100) * 100}%` }}
                />
              </div>
              <span className="text-xs">{xp % 100} / 100 XP</span>
            </div>
            <div className="text-xs text-gray-500">
              Keep completing tasks to reach Level {getLevel(xp) + 1}!
            </div>
          </div>

          {/* User Statistics */}
          <div className="bg-white rounded-xl shadow p-4 transition-all duration-700">
            <div className="flex items-center gap-2 mb-2">
              <FaChartBar className="text-blue-500 transition-transform duration-300 hover:scale-110" />
              <span className="font-bold">Your Stats</span>
            </div>
            <ul className="text-sm">
              <li>Total Tasks Completed: **{userStats.totalTasksCompleted}**</li>
              <li>Current Streak: **{userStats.currentStreak}** days</li>
              <li>Highest Streak: **{userStats.highestStreak}** days</li>
            </ul>
            <button
              className="text-violet-600 text-xs underline mt-2 transition-colors duration-300 hover:text-violet-800"
              onClick={() => setShowStatsModal(true)}
            >
              View Full Stats
            </button>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-xl shadow p-4 transition-all duration-700">
            <div className="flex items-center gap-2 mb-2">
              <FaTrophy className="text-orange-500 transition-transform duration-300 hover:scale-110" />
              <span className="font-bold">Achievements ({achievements.filter(a => a.unlocked).length}/{achievements.length})</span>
            </div>
            <ul className="text-xs mb-2">
              {achievements.slice(0, 3).map(ach => (
                <li key={ach.id} className={clsx("flex items-center gap-2", ach.unlocked ? "text-green-700" : "text-gray-500")}>
                  {ach.icon} {ach.name} {ach.unlocked && <FaCheckCircle className="text-green-500" />}
                </li>
              ))}
              {achievements.filter(a => a.unlocked).length === 0 && (
                <p className="text-gray-400">No achievements yet!</p>
              )}
            </ul>
            <button
              className="text-violet-600 text-xs underline transition-colors duration-300 hover:text-violet-800"
              onClick={() => setShowAchievementsModal(true)}
            >
              View All Achievements
            </button>
          </div>

          {/* XP History */}
          <div className="bg-white rounded-xl shadow p-4 transition-all duration-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-500">⏱️</span>
              <span className="font-bold">XP History</span>
            </div>
            <ul className="text-xs mb-2">
              {xpHistory.slice(0, 3).map(item => (
                <li key={item.id} className={item.change > 0 ? "text-green-600" : "text-red-600"}>
                  <div>
                    <span className="font-semibold">{item.change > 0 ? "+" : ""}{item.change} XP</span>
                    <span className="ml-2">{item.description}</span>
                  </div>
                  <span className="text-gray-400 block mt-1">{new Date(item.timestamp).toLocaleString()}</span>
                </li>
              ))}
              {xpHistory.length === 0 && <p className="text-gray-400">No XP history yet.</p>}
            </ul>
            <button
              className="text-violet-600 text-xs underline transition-colors duration-300 hover:text-violet-800"
              onClick={() => setShowXPModal(true)}
            >
              View All History
            </button>
          </div>

          {/* Rewards */}
          <div className="bg-white rounded-xl shadow p-4 transition-all duration-700">
            <div className="flex items-center gap-2 mb-2">
              <FaGift className="text-violet-500 transition-transform duration-300 hover:scale-110" />
              <span className="font-bold">Rewards</span>
            </div>
            <button
              className={clsx(
                currentTheme.secondary,
                "text-white px-3 py-1 rounded-full text-sm mb-3 hover:opacity-90 transition-all duration-300 active:scale-95 flex items-center gap-1"
              )}
              onClick={() => setShowCustomRewardModal(true)}
            >
              <FaPlus /> Custom Reward
            </button>
            <ul>
              {allRewards.map(reward => (
                <li
                  key={reward.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg mb-3 p-3 transition-all duration-300 hover:bg-gray-100"
                >
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <span className="text-2xl">{reward.emoji}</span>
                      {reward.name}
                    </div>
                    <div className="text-xs text-gray-500">{reward.cost} XP</div>
                  </div>
                  <button
                    className={clsx(
                      "px-4 py-2 rounded font-semibold text-white transition-all duration-300 active:scale-95",
                      xp >= reward.cost
                        ? currentTheme.primary + " hover:opacity-90"
                        : "bg-gray-400 cursor-not-allowed"
                    )}
                    disabled={xp < reward.cost}
                    onClick={() => handleRedeem(reward)}
                  >
                    Redeem
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && ( // FIX: Conditionally render based on selectedTask existence
        <TaskModal
          task={selectedTask} // FIX: Removed ! as it's now guaranteed by the conditional render
          onClose={() => setSelectedTask(null)}
          onSave={handleEditTask}
          onComplete={handleCompleteTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* XP History Modal */}
      <Modal onClose={() => setShowXPModal(false)} isOpen={showXPModal}>
        <div className="max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-4">XP History</h2>
          <button
            className="bg-red-500 text-white px-3 py-1 rounded mb-4 transition-all duration-300 active:scale-95 hover:bg-red-600"
            onClick={handleDeleteXPHistory}
          >
            Delete All History
          </button>
          <ul className="max-h-96 overflow-y-auto">
            {xpHistory.length === 0 ? (
              <p className="text-gray-400">No XP history yet.</p>
            ) : (
              xpHistory.map(item => (
                <li
                  key={item.id}
                  className={clsx(
                    "mb-2 p-2 rounded transition-all duration-300",
                    item.change > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}
                >
                  <div>
                    <span className="font-semibold">{item.change > 0 ? "+" : ""}{item.change} XP</span>
                    <span className="ml-2">{item.description}</span>
                  </div>
                  <span className="text-gray-500 text-sm">{new Date(item.timestamp).toLocaleString()}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </Modal>

      {/* Stats Modal */}
      <Modal onClose={() => setShowStatsModal(false)} isOpen={showStatsModal}>
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4">Your Statistics</h2>
          <ul className="text-lg space-y-2">
            <li><FaTasks className="inline-block mr-2 text-violet-600" /> Total Tasks Completed: **{userStats.totalTasksCompleted}**</li>
            <li><FaCalendarAlt className="inline-block mr-2 text-green-500" /> Current Streak: **{userStats.currentStreak}** days</li>
            <li><FaTrophy className="inline-block mr-2 text-orange-500" /> Highest Streak: **{userStats.highestStreak}** days</li>
            <li><span className="text-yellow-500 text-xl mr-2">⭐</span> Total XP Earned: **{xp}**</li>
            {/* Could add more stats here, e.g., tasks by priority, tasks by category */}
          </ul>
        </div>
      </Modal>

      {/* Achievements Modal */}
      <Modal onClose={() => setShowAchievementsModal(false)} isOpen={showAchievementsModal}>
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4">Your Achievements</h2>
          <ul className="space-y-3">
            {achievements.map(ach => (
              <li
                key={ach.id}
                className={clsx(
                  "p-3 rounded-lg flex items-center",
                  ach.unlocked ? "bg-green-50 text-green-800 border-l-4 border-green-400" : "bg-gray-50 text-gray-600 border-l-4 border-gray-300"
                )}
              >
                <span className="text-3xl mr-4">{ach.icon}</span>
                <div>
                  <h3 className="font-bold">{ach.name} {ach.unlocked && <FaCheckCircle className="inline ml-1 text-green-500" />}</h3>
                  <p className="text-sm">{ach.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Modal>

      {/* Custom Reward Modal */}
      <CustomRewardModal
        onClose={() => setShowCustomRewardModal(false)}
        onSave={handleAddCustomReward}
        isOpen={showCustomRewardModal}
      />

      {/* Info/Success/Error Modal */}
      {showMsg && (
        <Modal onClose={() => setShowMsg(null)} isOpen={!!showMsg}>
          <div className="p-4">
            <div
              className={clsx(
                "font-bold mb-2 transition-colors duration-300",
                showMsg.type === "success" ? "text-green-600" : "text-red-600"
              )}
            >
              {showMsg.type === "success" ? "Success" : "Error"}
            </div>
            <div>{showMsg.msg}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
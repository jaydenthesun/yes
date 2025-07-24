"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaGift,
  // FaUser, // Removed: 'FaUser' is defined but never used.
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
function uuid(): string {
  if (typeof window !== "undefined") {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return "server-id-" + Math.random().toString(36).slice(2);
}

function getTodayDateString(): string {
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
function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case "High":
      return "border-red-500";
    case "Medium":
      return "border-yellow-400";
    default:
      return "border-blue-500";
  }
}

function getLevel(xp: number): number {
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
  // const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null); // Removed: 'authMode' is assigned a value but never used.
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
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS); // Initialize with constants
  const [userStats, setUserStats] = useState<UserStats>({
    totalTasksCompleted: 0,
    highestStreak: 0,
    currentStreak: 0,
    lastStreakCheckDate: "",
  });
  const [theme, setTheme] = useState<Theme>("default");
  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");

  // --- Load from Local Storage on Client (User-specific data) ---
  // This useEffect now correctly re-hydrates achievements
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedEmail = localStorage.getItem("userEmail");
      const storedLoggedIn = localStorage.getItem("isLoggedIn") === "true";

      if (storedLoggedIn && storedEmail) {
        setIsLoggedIn(true);
        setUsername(localStorage.getItem(`username-${storedEmail}`) || storedEmail.split('@')[0]);
        setTasks(JSON.parse(localStorage.getItem(`tasks-${storedEmail}`) || "[]"));
        setXP(Number(localStorage.getItem(`xp-${storedEmail}`) || "0"));
        setXPHistory(JSON.parse(localStorage.getItem(`xpHistory-${storedEmail}`) || "[]"));
        setUserRewards(JSON.parse(localStorage.getItem(`userRewards-${storedEmail}`) || "[]"));

        // Load achievements and re-hydrate the 'check' functions
        const storedAchievementsData = localStorage.getItem(`achievements-${storedEmail}`);
        const loadedAchievements: Pick<Achievement, 'id' | 'unlocked'>[] = storedAchievementsData ? JSON.parse(storedAchievementsData) : [];

        const rehydratedAchievements = ACHIEVEMENTS.map(initialAch => {
          const storedAch = loadedAchievements.find(la => la.id === initialAch.id);
          // If a stored version exists, use its 'unlocked' status, otherwise use initial
          return storedAch ? { ...initialAch, unlocked: storedAch.unlocked } : initialAch;
        });
        setAchievements(rehydratedAchievements);

        setUserStats(JSON.parse(localStorage.getItem(`userStats-${storedEmail}`) || JSON.stringify(userStats)));
        setTheme(localStorage.getItem(`theme-${storedEmail}`) as Theme || "default");
      } else {
        // Reset to default/guest state if not logged in
        setIsLoggedIn(false);
        setUsername("Guest");
        setTasks([]);
        setXP(0);
        setXPHistory([]);
        setUserRewards([]);
        setAchievements(ACHIEVEMENTS); // Always start with fresh achievements for guests
        setUserStats({ totalTasksCompleted: 0, highestStreak: 0, currentStreak: 0, lastStreakCheckDate: "" });
        setTheme("default");
      }
      setLoading(false); // Finished initial load
    }
  }, [isLoggedIn]); // Rerun when login state changes

  // --- Persist to Local Storage (User-specific data) ---
  // Store only the `unlocked` status of achievements, not the functions
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
      // Store only the serializable parts of achievements (id and unlocked status)
      const serializableAchievements = achievements.map(({ id, unlocked }) => ({ id, unlocked }));
      localStorage.setItem(`achievements-${currentEmail}`, JSON.stringify(serializableAchievements));
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

    // Changed to const as it's not reassigned globally in this block
    const updatedTasks = [...tasks];

    // Check streak
    if (userStats.lastStreakCheckDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      const completedToday = tasks.some(t => t.completed && t.lastCompletedDate === today);
      const completedYesterday = tasks.some(t => t.completed && t.lastCompletedDate === yesterdayString);

      if (completedToday) {
        if (completedYesterday || userStats.lastStreakCheckDate === "") { // Streak continues or starts
          setUserStats(prev => {
            const newCurrentStreak = prev.currentStreak + 1;
            // Only award XP if it's a new highest streak
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
        } else { // Streak broken (completed today but not yesterday, and streak was active)
          setUserStats(prev => ({
            ...prev,
            currentStreak: 1, // Start a new streak
            lastStreakCheckDate: today,
          }));
        }
      } else { // No task completed today
        // Only break streak if last check date was not today or yesterday
        if (userStats.lastStreakCheckDate !== "" && userStats.lastStreakCheckDate !== yesterdayString && userStats.currentStreak > 0) {
          setUserStats(prev => ({
            ...prev,
            currentStreak: 0,
            lastStreakCheckDate: today,
          }));
        } else if (userStats.lastStreakCheckDate === "") { // First time checking for a new user
          setUserStats(prev => ({
            ...prev,
            lastStreakCheckDate: today,
          }));
        }
      }
    }

    // Handle recurring tasks
    const tasksAfterRecurrenceReset = updatedTasks.map(task => {
      if (task.recurrence === "None" || !task.completed) {
        return task;
      }

      const lastCompleted = task.lastCompletedDate;
      if (!lastCompleted) return task; // Should not happen for recurring completed tasks

      const lastDate = new Date(lastCompleted);
      const nextResetDate = new Date(lastDate);

      let shouldReset = false;

      switch (task.recurrence) {
        case "Daily":
          nextResetDate.setDate(lastDate.getDate() + 1);
          shouldReset = nextResetDate.toISOString().split('T')[0] <= today;
          break;
        case "Weekly":
          nextResetDate.setDate(lastDate.getDate() + 7);
          shouldReset = nextResetDate.toISOString().split('T')[0] <= today;
          break;
        case "Monthly":
          nextResetDate.setMonth(lastDate.getMonth() + 1);
          shouldReset = nextResetDate.toISOString().split('T')[0] <= today;
          break;
      }

      if (shouldReset) {
        return {
          ...task,
          completed: false, // Reset completion status
          lastCompletedDate: undefined, // Clear last completed date
          createdAt: Date.now(), // Treat as new for sorting
          dueDate: task.recurrence === "Daily" ? today : task.dueDate, // Consider updating due date for daily recurring
        };
      }
      return task;
    });

    // Only update tasks if changes were made due to recurrence or initial load
    const didTasksChange = JSON.stringify(tasksAfterRecurrenceReset) !== JSON.stringify(tasks);
    if (didTasksChange) {
      setTasks(tasksAfterRecurrenceReset);
    }
  }, [tasks, userStats, isLoggedIn]); // Added userStats to dependencies for exhaustive-deps


  // --- Achievement Check ---
  useEffect(() => {
    if (!isLoggedIn) return;
    let anyAchievementUnlocked = false;
    const updatedAchievements = achievements.map(ach => {
      if (!ach.unlocked) {
        // Pass userStats to the achievement check function
        const isUnlocked = ach.check(userStats);
        if (isUnlocked) {
          anyAchievementUnlocked = true;
          setShowMsg({ type: "success", msg: `Achievement Unlocked: ${ach.name}! ${ach.icon}` });
          return { ...ach, unlocked: true };
        }
      }
      return ach;
    });
    if (anyAchievementUnlocked) {
      setAchievements(updatedAchievements);
    }
  }, [userStats, achievements, isLoggedIn]);


  // --- Authentication Handlers ---
  const handleLogin = useCallback(() => {
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
      // setAuthMode(null); // No longer needed
      setAuthEmail("");
      setAuthPassword("");
      setShowMsg({ type: "success", msg: `Welcome back, ${localStorage.getItem(`username-${authEmail}`) || authEmail.split('@')[0]}!` });
    } else {
      setAuthError("Invalid email or password.");
    }
  }, [authEmail, authPassword]);

  const handleSignUp = useCallback(() => {
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
    // setAuthMode(null); // No longer needed
    setAuthEmail("");
    setAuthPassword("");
    setShowMsg({ type: "success", msg: `Account created for ${authEmail.split('@')[0]}!` });
  }, [authEmail, authPassword]);

  const handleLogout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userEmail");
      localStorage.removeItem("isLoggedIn");
      setIsLoggedIn(false);
      setShowMsg({ type: "success", msg: "Logged out successfully!" });
    }
  }, []);

  // --- Task Handlers ---
  const handleAddTask = useCallback(() => {
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
    setShowMsg({ type: "success", msg: "Task added successfully!" });
  }, [taskInput, taskDescription, dueDate, priority, recurrence, category]);

  const handleUpdateTask = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    setShowMsg({ type: "success", msg: "Task updated!" });
  }, []);

  const handleDeleteTask = useCallback((taskToDelete: Task) => {
    setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
    setShowMsg({ type: "success", msg: "Task deleted!" });
  }, []);

  const handleToggleTaskCompletion = useCallback((taskToToggle: Task) => {
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task =>
        task.id === taskToToggle.id
          ? {
              ...task,
              completed: !task.completed,
              lastCompletedDate: !task.completed ? getTodayDateString() : undefined, // Set/clear last completed date
            }
          : task
      );

      const completedTask = updatedTasks.find(t => t.id === taskToToggle.id);

      if (completedTask && completedTask.completed) {
        // Calculate XP earned
        let xpEarned = XP_PER_TASK;
        if (completedTask.priority === "High") {
          xpEarned += XP_PER_HIGH_PRIORITY_TASK;
        }
        if (completedTask.dueDate && new Date(completedTask.dueDate) >= new Date()) {
          xpEarned += XP_PER_TASK_ON_TIME;
        }

        setXP(prevXP => prevXP + xpEarned);
        setXPHistory(prevHistory => [
          { id: uuid(), change: xpEarned, description: `Completed "${completedTask.text}"`, timestamp: Date.now() },
          ...prevHistory,
        ]);
        setShowMsg({ type: "success", msg: `Task Completed! +${xpEarned} XP` });

        // Update user stats for achievements/streaks
        setUserStats(prevStats => ({
          ...prevStats,
          totalTasksCompleted: prevStats.totalTasksCompleted + 1,
        }));
      }
      return updatedTasks;
    });
  }, []); // Dependencies for useCallback are handled by React's linting if needed, but none appear missing here.

  const handleAddCustomReward = useCallback((newReward: Omit<Reward, 'id'>) => {
    setUserRewards(prev => [...prev, { id: uuid(), ...newReward }]);
    setShowMsg({ type: "success", msg: `Custom reward "${newReward.name}" added!` });
  }, []);

  const handleRedeemReward = useCallback((reward: Reward) => {
    if (xp >= reward.cost) {
      setXP(prevXP => prevXP - reward.cost);
      setXPHistory(prevHistory => [
        { id: uuid(), change: -reward.cost, description: `Redeemed "${reward.name}"`, timestamp: Date.now() },
        ...prevHistory,
      ]);
      setShowMsg({ type: "success", msg: `You redeemed "${reward.name}"!` });
      if (reward.link) {
        window.open(reward.link, "_blank");
      }
    } else {
      setShowMsg({ type: "error", msg: `Not enough XP to redeem "${reward.name}".` });
    }
  }, [xp]);

  const handleDeleteReward = useCallback((rewardId: string) => {
    setUserRewards(prev => prev.filter(r => r.id !== rewardId));
    setShowMsg({ type: "success", msg: "Custom reward deleted." });
  }, []);


  const completedTasks = useMemo(() => tasks.filter(task => task.completed), [tasks]);
  const incompleteTasks = useMemo(() =>
    tasks
      .filter(task => !task.completed)
      .filter(task => filterCategory === "All" || task.category === filterCategory)
      .sort((a, b) => {
        // Sort by priority: High > Medium > Low
        const priorityOrder = { "High": 3, "Medium": 2, "Low": 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by due date (earliest first, undated last)
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1; // a has due date, b doesn't
        if (b.dueDate) return 1;  // b has due date, a doesn't
        return 0; // No due dates
      }),
    [tasks, filterCategory]
  );

  const totalRewards = useMemo(() => [...REWARDS, ...userRewards], [userRewards]);

  // --- Theme Application ---
  const currentTheme = THEME_CLASSES[theme];

  // --- Render Logic ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-3xl animate-pulse">
        Loading Your Productivity Hub...
      </div>
    );
  }

  return (
    <div className={clsx("min-h-screen p-4 transition-colors duration-300", currentTheme.bg, currentTheme.text)}>
      {/* Notification Message */}
      {showMsg && (
        <div
          className={clsx(
            "fixed top-4 left-1/2 -translate-x-1/2 z-50 p-3 rounded-lg shadow-md flex items-center gap-2 animate-fade-in-down",
            showMsg.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
          )}
          role="alert"
        >
          {showMsg.type === "success" ? (
            <FaCheckCircle className="text-xl" />
          ) : (
            <AiOutlineClose className="text-xl" />
          )}
          <span>{showMsg.msg}</span>
          <button onClick={() => setShowMsg(null)} className="ml-2">
            <AiOutlineClose />
          </button>
        </div>
      )}

      {/* Auth UI */}
      {!isLoggedIn && (
        <div className="max-w-md mx-auto my-10 p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-6 text-violet-600">Welcome to TaskMaster!</h1>
          <p className="text-gray-700 text-center mb-6">Login or sign up to manage your tasks, earn XP, and unlock achievements!</p>

          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
          />
          {authError && <p className="text-red-500 text-sm text-center mb-4">{authError}</p>}

          <div className="flex gap-4">
            <button
              onClick={handleLogin}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all duration-300 transform active:scale-95",
                currentTheme.primary, "text-white hover:bg-violet-700"
              )}
            >
              <FaSignInAlt /> Login
            </button>
            <button
              onClick={handleSignUp}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all duration-300 transform active:scale-95",
                "bg-gray-200 text-gray-800 hover:bg-gray-300"
              )}
            >
              <FaUserPlus /> Sign Up
            </button>
          </div>
        </div>
      )}

      {isLoggedIn && (
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-center py-6 border-b border-gray-300 mb-6">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <h1 className="text-4xl font-extrabold flex items-center">
                <FaTasks className="mr-2 text-violet-600" /> TaskMaster
              </h1>
              <div className="relative">
                {editingUsername ? (
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => setEditingUsername(false)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingUsername(false)}
                    className="p-1 border rounded"
                    autoFocus
                  />
                ) : (
                  <span className="text-2xl font-semibold cursor-pointer" onClick={() => setEditingUsername(true)}>
                    {username}
                  </span>
                )}
                <button onClick={() => setEditingUsername(true)} className="ml-2 text-gray-500 hover:text-gray-700">
                  <FaEdit />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 md:gap-4">
              <button
                onClick={() => setShowStatsModal(true)}
                className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform active:scale-95", currentTheme.secondary, "text-white hover:opacity-80")}
              >
                <FaChartBar /> Stats
              </button>
              <button
                onClick={() => setShowAchievementsModal(true)}
                className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform active:scale-95", currentTheme.secondary, "text-white hover:opacity-80")}
              >
                <FaTrophy /> Achievements
              </button>
              <button
                onClick={() => setShowXPModal(true)}
                className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform active:scale-95", currentTheme.secondary, "text-white hover:opacity-80")}
              >
                <FaGift /> Rewards
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform active:scale-95 bg-red-500 text-white hover:bg-red-600"
              >
                <FaSignOutAlt /> Logout
              </button>
            </div>
          </header>

          {/* XP & Level */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-gray-800">XP: {xp}</span>
              <span className="text-xl font-semibold text-violet-600">Level: {getLevel(xp)}</span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="theme-select" className="text-gray-700">Theme:</label>
              <select
                id="theme-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
                className="border rounded px-2 py-1 bg-gray-50"
              >
                <option value="default">Default</option>
                <option value="dark">Dark</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
              </select>
            </div>
          </div>

          {/* Add New Task */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Add New Task</h2>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="What needs to be done?"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
            />
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg mb-3 h-20 resize-y focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Description (optional)"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-gray-500" />
                <input
                  type="date"
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <FaTag className="text-gray-500" />
                <select
                  className="flex-1 p-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <BsFillCalendarDateFill className="text-gray-500" />
                <select
                  className="flex-1 p-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                >
                  <option value="None">No Recurrence</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <FaTag className="text-gray-500" />
                <select
                  className="flex-1 p-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleAddTask}
              className={clsx("w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-95", currentTheme.primary, "hover:opacity-80")}
            >
              <FaPlus /> Add Task
            </button>
          </div>

          {/* Task List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Your Tasks ({incompleteTasks.length})</h2>
              <select
                className="border rounded px-3 py-1 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as Category | "All")}
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            {incompleteTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No tasks to display! Add a new task above.</p>
            ) : (
              <ul>
                {incompleteTasks.map(task => (
                  <li
                    key={task.id}
                    className={clsx(
                      "flex items-center justify-between p-3 mb-2 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all duration-200",
                      getPriorityColor(task.priority),
                      "bg-gray-50"
                    )}
                  >
                    <div className="flex items-center flex-1 mr-4">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTaskCompletion(task)}
                        className="form-checkbox h-5 w-5 text-green-600 rounded mr-3"
                      />
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => setSelectedTask(task)}
                      >
                        <span className={clsx("font-medium", task.completed && "line-through text-gray-500")}>
                          {task.text}
                        </span>
                        {task.dueDate && (
                          <span className="ml-2 text-sm text-gray-500">
                            (Due: {task.dueDate})
                          </span>
                        )}
                        {task.category && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full">
                            {task.category}
                          </span>
                        )}
                        {task.recurrence !== "None" && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full">
                            {task.recurrence}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="text-gray-500 hover:text-violet-600 transition-colors"
                        aria-label="View task details"
                      >
                        <FaEdit />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {completedTasks.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-xl font-bold mb-3 text-gray-800">Completed Tasks ({completedTasks.length})</h3>
                <ul>
                  {completedTasks.map(task => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between p-3 mb-2 rounded-lg bg-green-50 border-l-4 border-green-400 text-gray-600 shadow-sm"
                    >
                      <div className="flex items-center flex-1 mr-4">
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTaskCompletion(task)}
                          className="form-checkbox h-5 w-5 text-green-600 rounded mr-3"
                        />
                        <span className="line-through flex-1">{task.text}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="text-gray-500 hover:text-violet-600 transition-colors"
                          aria-label="View task details"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          aria-label="Delete task"
                        >
                          <AiOutlineClose />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={handleUpdateTask}
          onComplete={handleToggleTaskCompletion}
          onDelete={handleDeleteTask}
        />
      )}

      {showXPModal && (
        <Modal onClose={() => setShowXPModal(false)} isOpen={true}>
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">Your Rewards & XP History</h2>
            <div className="mb-6">
              <p className="text-xl font-semibold">Current XP: {xp}</p>
              <p className="text-lg text-violet-600">Level: {getLevel(xp)}</p>
            </div>

            <div className="flex justify-between items-center mb-4 border-t pt-4">
              <h3 className="text-xl font-semibold">Available Rewards</h3>
              <button
                onClick={() => setShowCustomRewardModal(true)}
                className="bg-violet-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-violet-700 transition-colors"
              >
                + Custom Reward
              </button>
            </div>
            {totalRewards.length === 0 ? (
              <p className="text-gray-500 text-sm mb-4">No rewards available yet. Create one!</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {totalRewards.map(reward => (
                  <li key={reward.id} className="bg-gray-100 p-3 rounded-lg flex items-center justify-between shadow-sm">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{reward.emoji}</span>
                      <div>
                        <p className="font-semibold">{reward.name}</p>
                        <p className="text-sm text-gray-600">{reward.cost} XP</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRedeemReward(reward)}
                        className={clsx(
                          "bg-green-500 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-green-600 disabled:opacity-50",
                          xp < reward.cost && "cursor-not-allowed"
                        )}
                        disabled={xp < reward.cost}
                      >
                        Redeem
                      </button>
                      {reward.custom && (
                        <button
                          onClick={() => handleDeleteReward(reward.id)}
                          className="text-red-400 hover:text-red-600 text-sm"
                          aria-label="Delete custom reward"
                        >
                          <AiOutlineClose />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="text-xl font-semibold mb-3 border-t pt-4">XP History</h3>
            {xpHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">No XP history yet. Complete some tasks!</p>
            ) : (
              <ul className="max-h-60 overflow-y-auto">
                {xpHistory.map(item => (
                  <li key={item.id} className="flex justify-between items-center text-sm mb-1 pb-1 border-b border-gray-100 last:border-b-0">
                    <span className={clsx(item.change > 0 ? "text-green-600" : "text-red-600", "font-medium")}>
                      {item.change > 0 ? `+${item.change}` : item.change} XP
                    </span>
                    <span className="flex-1 ml-2">{item.description}</span>
                    <span className="text-gray-500 text-xs">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>
      )}

      {showCustomRewardModal && (
        <CustomRewardModal
          onClose={() => setShowCustomRewardModal(false)}
          onSave={handleAddCustomReward}
          isOpen={true}
        />
      )}

      {showStatsModal && (
        <Modal onClose={() => setShowStatsModal(false)} isOpen={true}>
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">Your Stats</h2>
            <div className="space-y-3 text-lg">
              <p><span className="font-semibold">Total Tasks Completed:</span> {userStats.totalTasksCompleted}</p>
              <p><span className="font-semibold">Current Streak:</span> {userStats.currentStreak} days</p>
              <p><span className="font-semibold">Highest Streak:</span> {userStats.highestStreak} days</p>
              <p><span className="font-semibold">Last Streak Check:</span> {userStats.lastStreakCheckDate || "Never"}</p>
            </div>
            <p className="text-sm text-gray-500 mt-4">Streaks are updated once daily when you complete a task.</p>
          </div>
        </Modal>
      )}

      {showAchievementsModal && (
        <Modal onClose={() => setShowAchievementsModal(false)} isOpen={true}>
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">Your Achievements</h2>
            {achievements.length === 0 ? (
              <p className="text-gray-500 text-sm">No achievements defined.</p>
            ) : (
              <ul className="space-y-3">
                {achievements.map(ach => (
                  <li key={ach.id} className={clsx("p-4 rounded-lg shadow-sm flex items-center",
                    ach.unlocked ? "bg-emerald-50 border-l-4 border-emerald-400" : "bg-gray-50 border-l-4 border-gray-300"
                  )}>
                    <span className="text-3xl mr-3">{ach.icon}</span>
                    <div>
                      <h3 className="font-semibold text-lg flex items-center">
                        {ach.name}
                        {ach.unlocked && <FaCheckCircle className="text-emerald-500 ml-2 text-xl" />}
                      </h3>
                      <p className="text-sm text-gray-700">{ach.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
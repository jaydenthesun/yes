"use client";

import React, { useState, useEffect } from "react";
import { FaGift, FaUser, FaCheckCircle, FaEdit } from "react-icons/fa";
import { BsFillCalendarDateFill } from "react-icons/bs";
import { AiOutlineClose } from "react-icons/ai";
import clsx from "clsx";

// --- Types ---
type Priority = "Low" | "Medium" | "High";
type Task = {
  id: string;
  text: string;
  dueDate?: string;
  priority: Priority;
  completed: boolean;
  createdAt: number;
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
};

// --- Constants ---
const REWARDS: Reward[] = [
  { id: "movie", name: "Movie Ticket", emoji: "🎬", cost: 500 },
  { id: "giftcard", name: "Online Store Gift Card ($10)", emoji: "🎁", cost: 1000 },
  { id: "coffee", name: "Coffee Voucher", emoji: "☕", cost: 200 },
  { id: "bookstore", name: "Bookstore Voucher ($5)", emoji: "📚", cost: 300 },
  { id: "gaming", name: "Gaming Credit ($20)", emoji: "🎮", cost: 1200 },
];

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
function getXPForNextLevel(xp: number) {
  return 100 - (xp % 100);
}
function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// --- Local Storage Helpers ---
function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Main Component ---
export default function HomePage() {
  // --- State ---
  const [username, setUsername] = useState(() => load("username", "User-XXXX"));
  const [editingUsername, setEditingUsername] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(() => load("tasks", []));
  const [taskInput, setTaskInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("Low");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [xp, setXP] = useState(() => load("xp", 0));
  const [xpHistory, setXPHistory] = useState<XPHistoryItem[]>(() => load("xpHistory", []));
  const [showXPModal, setShowXPModal] = useState(false);
  const [showMsg, setShowMsg] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // --- Persist to Local Storage ---
  useEffect(() => { save("tasks", tasks); }, [tasks]);
  useEffect(() => { save("xp", xp); }, [xp]);
  useEffect(() => { save("xpHistory", xpHistory); }, [xpHistory]);
  useEffect(() => { save("username", username); }, [username]);

  // --- Handlers ---
  function handleAddTask() {
    if (!taskInput.trim()) return;
    const newTask: Task = {
      id: uuid(),
      text: taskInput,
      dueDate: dueDate || undefined,
      priority,
      completed: false,
      createdAt: Date.now(),
    };
    setTasks(prev => [...prev, newTask]);
    setTaskInput("");
    setDueDate("");
    setPriority("Low");
    setShowMsg({ type: "success", msg: "Task added!" });
  }
  function handleCompleteTask(task: Task) {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t));
    setXP(prev => prev + 20);
    setXPHistory(prev => [
      { id: uuid(), change: 20, description: `Completed task: "${task.text}"`, timestamp: Date.now() },
      ...prev,
    ]);
    setShowMsg({ type: "success", msg: "Task completed! +20 XP" });
  }
  function handleDeleteTask(task: Task) {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    setShowMsg({ type: "success", msg: "Task deleted." });
  }
  function handleEditTask(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setShowMsg({ type: "success", msg: "Task updated." });
  }
  function handleRedeem(reward: Reward) {
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
  }
  function handleUsernameChange(newName: string) {
    setUsername(newName);
    setEditingUsername(false);
    setShowMsg({ type: "success", msg: "Username updated!" });
  }

  // --- Sorting ---
  const sortedTasks = [...tasks]
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pOrder = { High: 0, Medium: 1, Low: 2 };
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
      return a.createdAt - b.createdAt;
    });

  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-violet-600">Gamified To-Do</h1>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <FaUser className="text-xl" />
          {editingUsername ? (
            <input
              className="border rounded px-2 py-1"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onBlur={() => handleUsernameChange(username)}
              onKeyDown={e => e.key === "Enter" && handleUsernameChange(username)}
              autoFocus
            />
          ) : (
            <span
              className="font-semibold cursor-pointer hover:underline"
              onClick={() => setEditingUsername(true)}
              title="Edit username"
            >
              {username}
              <FaEdit className="inline ml-1 text-gray-400" />
            </span>
          )}
          <span className="ml-2 text-gray-500">
            Level: {getLevel(xp)} | Tasks Completed: {tasks.filter(t => t.completed).length}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Tasks */}
        <div className="flex-1 bg-white rounded-xl shadow p-6">
          <div className="flex items-center mb-4">
            <FaCheckCircle className="text-green-500 mr-2" />
            <h2 className="text-xl font-bold">Your Tasks</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-2 mb-4">
            <input
              className="border rounded px-2 py-1 flex-1"
              placeholder="Add a new task..."
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddTask()}
            />
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <select
              className="border rounded px-2 py-1"
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
            </select>
            <button
              className="bg-violet-600 text-white px-4 py-2 rounded font-semibold hover:bg-violet-700 transition"
              onClick={handleAddTask}
            >
              + Add Task
            </button>
          </div>
          {sortedTasks.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No tasks yet! Add one to start earning XP.</div>
          ) : (
            <ul>
              {sortedTasks.map(task => (
                <li
                  key={task.id}
                  className={clsx(
                    "flex items-center justify-between bg-gray-50 rounded-lg mb-3 p-4 shadow-sm border-l-4 cursor-pointer transition hover:bg-gray-100",
                    getPriorityColor(task.priority),
                    task.completed && "opacity-60"
                  )}
                  onClick={() => setSelectedTask(task)}
                >
                  <div>
                    <div className="font-semibold">{task.text}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {task.dueDate && (
                        <>
                          <BsFillCalendarDateFill /> {task.dueDate}
                        </>
                      )}
                      <span>
                        {task.priority} Priority
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!task.completed && (
                      <button
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                        onClick={e => {
                          e.stopPropagation();
                          handleCompleteTask(task);
                        }}
                      >
                        Complete
                      </button>
                    )}
                    <button
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
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
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-500">🏅</span>
              <span className="font-bold">Progress</span>
            </div>
            <div className="font-semibold mb-1">Level {getLevel(xp)}</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-full bg-gray-200 rounded h-3 overflow-hidden">
                <div
                  className="bg-yellow-400 h-3 rounded"
                  style={{ width: `${((xp % 100) / 100) * 100}%` }}
                />
              </div>
              <span className="text-xs">{xp % 100} / 100 XP</span>
            </div>
            <div className="text-xs text-gray-500">
              Keep completing tasks to reach Level {getLevel(xp) + 1}!
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-500">📝</span>
              <span className="font-bold">Upcoming Tasks ({sortedTasks.filter(t => !t.completed).length})</span>
            </div>
            {sortedTasks.filter(t => !t.completed).length === 0 ? (
              <div className="text-xs text-gray-400">No uncompleted tasks!</div>
            ) : (
              <ul className="text-xs">
                {sortedTasks
                  .filter(t => !t.completed)
                  .slice(0, 3)
                  .map(t => (
                    <li key={t.id} className="mb-1">
                      {t.text} {t.dueDate && <span className="text-gray-400">({t.dueDate})</span>}
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* XP History */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-500">⏱️</span>
              <span className="font-bold">XP History</span>
            </div>
            <ul className="text-xs mb-2">
              {xpHistory.slice(0, 3).map(item => (
                <li key={item.id} className={item.change > 0 ? "text-green-600" : "text-red-600"}>
                  {item.change > 0 ? "+" : ""}
                  {item.change} XP: {item.description}
                </li>
              ))}
            </ul>
            <button
              className="text-violet-600 text-xs underline"
              onClick={() => setShowXPModal(true)}
            >
              View All History
            </button>
          </div>

          {/* Rewards */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaGift className="text-violet-500" />
              <span className="font-bold">Rewards</span>
            </div>
            <ul>
              {REWARDS.map(reward => (
                <li
                  key={reward.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg mb-3 p-3"
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
                      "px-4 py-2 rounded font-semibold text-white transition",
                      xp >= reward.cost
                        ? "bg-violet-400 hover:bg-violet-500"
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
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onSave={handleEditTask}
          onComplete={handleCompleteTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* XP History Modal */}
      {showXPModal && (
        <Modal onClose={() => setShowXPModal(false)}>
          <div className="max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-4">XP History</h2>
            <ul className="max-h-96 overflow-y-auto">
              {xpHistory.map(item => (
                <li
                  key={item.id}
                  className={clsx(
                    "mb-2 p-2 rounded",
                    item.change > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}
                >
                  <div>
                    <span className="font-semibold">{item.change > 0 ? "+" : ""}{item.change} XP</span>
                    <span className="ml-2">{item.description}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}

      {/* Info/Success/Error Modal */}
      {showMsg && (
        <Modal onClose={() => setShowMsg(null)}>
          <div className="p-4">
            <div
              className={clsx(
                "font-bold mb-2",
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

// --- Task Modal ---
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
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [priority, setPriority] = useState<Priority>(task.priority);

  return (
    <Modal onClose={onClose}>
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Task Details</h2>
          <button onClick={onClose}>
            <AiOutlineClose className="text-xl" />
          </button>
        </div>
        {edit ? (
          <>
            <input
              className="border rounded px-2 py-1 w-full mb-2"
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <input
              type="date"
              className="border rounded px-2 py-1 w-full mb-2"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <select
              className="border rounded px-2 py-1 w-full mb-2"
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
            </select>
            <button
              className="bg-violet-600 text-white px-4 py-2 rounded font-semibold hover:bg-violet-700 mr-2"
              onClick={() => {
                onSave({ ...task, text, dueDate, priority });
                setEdit(false);
              }}
            >
              Save
            </button>
            <button
              className="bg-gray-300 px-4 py-2 rounded"
              onClick={() => setEdit(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <div className="mb-2">
              <span className="font-semibold">Task:</span> {task.text}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Due Date:</span> {task.dueDate || "None"}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Priority:</span> {task.priority}
            </div>
            <div className="flex gap-2 mt-4">
              {!task.completed && (
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  onClick={() => onComplete(task)}
                >
                  Mark Complete
                </button>
              )}
              <button
                className="bg-violet-600 text-white px-4 py-2 rounded hover:bg-violet-700"
                onClick={() => setEdit(true)}
              >
                Edit
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
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

// --- Generic Modal ---
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 relative animate-fadeIn">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <AiOutlineClose className="text-xl" />
        </button>
        {children}
      </div>
    </div>
  );
}
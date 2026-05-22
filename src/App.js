import { useState, useEffect } from "react";
import "./App.css";

const GEMINI_API_KEY = "";

function App() {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem("tasks");
    return saved ? JSON.parse(saved) : [];
  });
  const [taskName, setTaskName] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem("streak");
    return saved ? JSON.parse(saved) : { count: 0, lastDate: null };
  });
  const [aiInput, setAiInput] = useState("");
  const [aiResult, setAiResult] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  function addTask() {
    if (!taskName) return;
    const newTask = {
      id: Date.now(),
      name: taskName,
      subject: subject,
      deadline: deadline,
      done: false,
    };
    setTasks([...tasks, newTask]);
    setTaskName("");
    setSubject("");
    setDeadline("");
  }

  function toggleTask(id) {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        if (!task.done) updateStreak();
        return { ...task, done: !task.done };
      }
      return task;
    }));
  }

  function deleteTask(id) {
    setTasks(tasks.filter(task => task.id !== id));
  }

  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setTimerRunning(false);
          return 25 * 60;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function isUrgent(deadline) {
    if (!deadline) return false;
    const today = new Date();
    const due = new Date(deadline);
    const daysLeft = (due - today) / (1000 * 60 * 60 * 24);
    return daysLeft <= 2;
  }

  function updateStreak() {
    const today = new Date().toDateString();
    if (streak.lastDate === today) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const newStreak = {
      count: streak.lastDate === yesterday.toDateString() ? streak.count + 1 : 1,
      lastDate: today,
    };
    setStreak(newStreak);
    localStorage.setItem("streak", JSON.stringify(newStreak));
  }

  async function breakDownTask() {
    if (!aiInput) return;
    setAiLoading(true);
    setAiResult([]);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Break this study task into 4 specific subtasks with time estimates. Return ONLY a JSON array of strings, nothing else. Task: "${aiInput}"`
            }]
          }]
        })
      }
    );
    const data = await response.json();
    console.log(data);
    const text = data.candidates[0].content.parts[0].text;
    const clean = text.replace(/```json|```/g, "").trim();
    setAiResult(JSON.parse(clean));
    setAiLoading(false);
  }

  return (
    <div className="app">
      <h1>Study Planner</h1>

      <div className="stats">
        <div className="stat">
          <span className="stat-label">Tasks to do</span>
          <span className="stat-value">{tasks.filter(t => !t.done).length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Completed</span>
          <span className="stat-value green">{tasks.filter(t => t.done).length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Focus streak</span>
          <span className="streak">🔥 {streak.count}d</span>
        </div>
      </div>

      <p className="section-title">Today's tasks</p>

      <ul className="task-list">
        {tasks.map(task => (
          <li key={task.id} className={isUrgent(task.deadline) && !task.done ? "urgent" : ""}>
            <div className="task-top">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task.id)}
              />
              <span className={`task-name ${task.done ? "done" : ""}`}>{task.name}</span>
              <button onClick={() => deleteTask(task.id)}>Delete</button>
            </div>
            <div className="task-bottom">
              {task.subject && <span className="subject">{task.subject}</span>}
              {task.deadline && (
                <span className={`due-date ${isUrgent(task.deadline) && !task.done ? "urgent" : "normal"}`}>
                  Due {new Date(task.deadline).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="add-task">
        <input
          type="text"
          placeholder="Task name"
          value={taskName}
          onChange={e => setTaskName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={e => setSubject(e.target.value)}
        />
        <input
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
        />
        <button onClick={addTask}>Add task</button>

      </div>
      <div className="ai-box">
        <p className="section-title">✦ AI task breakdown</p>
        <div className="ai-input-row">
          <input
            type="text"
            placeholder="e.g. study for algorithms midterm"
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
          />
          <button onClick={breakDownTask}>
            {aiLoading ? "Thinking..." : "Break it down"}
          </button>
        </div>
        {aiResult.length > 0 && (
          <ul className="ai-result">
            {aiResult.map((step, i) => (
              <li key={i}>○ {step}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="timer">
        <div className="timer-left">
          <p className="timer-label">Focus timer</p>
          <h2>{formatTime(timeLeft)}</h2>
        </div>
        <input
          type="number"
          min="1"
          max="120"
          value={customMinutes}
          onChange={e => setCustomMinutes(e.target.value)}
        />
        <span>min</span>
        <button onClick={() => setTimerRunning(!timerRunning)}>
          {timerRunning ? "Pause" : "Start"}
        </button>
        <button onClick={() => {
          setTimerRunning(false);
          setTimeLeft(customMinutes * 60);
        }}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default App;

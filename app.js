// DOM Elements
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const sessionCount = document.getElementById('sessionCount');
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const currentTaskDisplay = document.getElementById('currentTask');
const tasksList = document.getElementById('tasks');
const totalWorkTime = document.getElementById('totalWorkTime');
const completedTasksCount = document.getElementById('completedTasks');
const taskBreakdownList = document.getElementById('taskBreakdownList');
const timerSound = document.getElementById('timerSound');

// Timer variables
let workDuration = 25 * 60; // 25 minutes in seconds
let shortBreakDuration = 5 * 60; // 5 minutes in seconds
let longBreakDuration = 15 * 60; // 15 minutes in seconds
let currentTime = workDuration;
let timerInterval;
let isRunning = false;
let isWorkTime = true;
let sessionsCompleted = 0;

// Task management
let currentTask = null;
let taskTimes = {}; // To track time spent on each task
let dailyStats = {}; // To track daily sessions and time worked
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

// Add missing tasks declaration
let tasks = [];

// Get today's stats
function getDailyStats() {
    const today = new Date().toISOString().split('T')[0];
    if (!dailyStats[today]) {
        dailyStats[today] = {
            sessionsCompleted: 0,
            timeWorked: 0,
            taskTimes: {}
        };
    }
    return dailyStats[today];
}

// Load data from localStorage
function loadData() {
    const savedTasks = localStorage.getItem('pomodoroTasks');
    const savedDailyStats = localStorage.getItem('pomodoroDailyStats');
    
    if (savedTasks) tasks = JSON.parse(savedTasks);
    if (savedDailyStats) {
        dailyStats = JSON.parse(savedDailyStats);
        const todayStats = getDailyStats();
        sessionsCompleted = todayStats.sessionsCompleted || 0;
        sessionCount.textContent = `${sessionsCompleted}/8`;
    }
    
    updateTaskList();
    updateReport();
}

// Save data to localStorage
function saveData() {
    const todayStats = getDailyStats();
    todayStats.sessionsCompleted = sessionsCompleted;
    
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    localStorage.setItem('pomodoroDailyStats', JSON.stringify(dailyStats));
}

// Format time as MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update the timer display
function updateDisplay() {
    timerDisplay.textContent = formatTime(currentTime);
    document.title = `${formatTime(currentTime)} - ${isWorkTime ? 'Work Time' : 'Break Time'}`;
}

// Start the timer
function startTimer() {
    if (!isRunning) {
        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        
        timerInterval = setInterval(() => {
            currentTime--;
            updateDisplay();
            
            if (currentTime <= 0) {
                clearInterval(timerInterval);
                isRunning = false;
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                timerSound.play();
                showNotification(
                    isWorkTime ? 'Work session completed!' : 'Break time is over!',
                    isWorkTime ? 'Time for a break!' : 'Back to work!'
                );
                
                if (isWorkTime) {
                    // Update task time when session completes
                    updateTaskTime(workDuration);

                    sessionsCompleted++;
                    const todayStats = getDailyStats();
                    todayStats.sessionsCompleted = sessionsCompleted;
                    sessionCount.textContent = `${sessionsCompleted}/8`;
                    
                    // Every 4th session is a long break
                    const isLongBreak = sessionsCompleted % 4 === 0;
                    startBreak(isLongBreak);
                } else {
                    // Break is over, start work
                    startWork();
                }
            }
        }, 1000);
    }
}

// Add this helper function to update task time
function updateTaskTime(elapsedTime) {
    if (currentTask && isWorkTime) {
        const taskId = currentTask.id;
        const todayStats = getDailyStats();

        // Update task times for today
        todayStats.taskTimes[taskId] = (todayStats.taskTimes[taskId] || 0) + elapsedTime;

        // Update total time worked today
        todayStats.timeWorked = (todayStats.timeWorked || 0) + elapsedTime;

        saveData();
        updateReport();
    }
}

// Pause the timer
function pauseTimer() {
    if (isRunning) {
        clearInterval(timerInterval);
        isRunning = false;
        startBtn.disabled = false;
        pauseBtn.disabled = true;

        // Calculate elapsed time in this session
        const elapsedTime = isWorkTime ?
            workDuration - currentTime :
            (isWorkTime ? shortBreakDuration : longBreakDuration) - currentTime;

        // Update task time when paused
        updateTaskTime(elapsedTime);
    }
}

// Reset the timer
function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    currentTime = workDuration;
    updateDisplay();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
}

// Start a work session
function startWork() {
    isWorkTime = true;
    currentTime = workDuration;
    updateDisplay();
    document.body.style.backgroundColor = '';
    // Do not auto-start the timer here; let the user start the session manually
}

// Start a break (short or long)
function startBreak(isLongBreak = false) {
    isWorkTime = false;
    currentTime = isLongBreak ? longBreakDuration : shortBreakDuration;
    updateDisplay();
    document.body.style.backgroundColor = '#f0f8ff';
    // Do not auto-start the timer here; let the user start the break manually
}

// Show browser notification
function showNotification(title, body) {
    if (!('Notification' in window)) {
        console.log('This browser does not support desktop notifications');
        return;
    }
    
    if (Notification.permission === 'granted') {
        new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, { body });
            }
        });
    }
}

// Add a new task
function addTask() {
    const taskText = taskInput.value.trim();
    if (taskText) {
        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(task);
        saveData();
        updateTaskList();
        taskInput.value = '';
        
        // If no current task, set this one as current
        if (!currentTask) {
            setCurrentTask(task);
        }
    }
}

// Set the current task
function setCurrentTask(task) {
    currentTask = task;
    currentTaskDisplay.textContent = task.text;
    
    // Update task list to show which one is active
    updateTaskList();
}

// Toggle task completion
function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveData();
        updateTaskList();
        updateReport();
    }
}

// Delete a task
function deleteTask(taskId, event) {
    event.stopPropagation();
    tasks = tasks.filter(task => task.id !== taskId);
    
    if (currentTask && currentTask.id === taskId) {
        currentTask = tasks.length > 0 ? tasks[0] : null;
        currentTaskDisplay.textContent = currentTask ? currentTask.text : 'No active task';
    }
    
    saveData();
    updateTaskList();
    updateReport();
}

// Update the task list in the UI
function updateTaskList() {
    tasksList.innerHTML = '';
    
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''} ${currentTask && currentTask.id === task.id ? 'active' : ''}`;
        
        // Create checkbox for task completion
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.onclick = (e) => {
            e.stopPropagation();
            toggleTaskCompletion(task.id);
        };
        
        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = task.text;
        taskText.onclick = () => setCurrentTask(task);
        
        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => deleteTask(task.id, e);
        
        taskActions.appendChild(deleteBtn);
        
        li.appendChild(checkbox);
        li.appendChild(taskText);
        li.appendChild(taskActions);
        tasksList.appendChild(li);
    });
}

// Update the report section
function updateReport() {
    // Update today's stats
    const todayStats = getDailyStats();
    const totalTime = todayStats.timeWorked || 0;
    const hours = Math.floor(totalTime / 3600);
    const minutes = Math.floor((totalTime % 3600) / 60);
    
    // Update the time display (fixed variable name)
    if (totalWorkTime) {
        totalWorkTime.textContent = `${hours}h ${minutes}m`;
    }
    
    // Update task breakdown
    if (taskBreakdownList) {
        taskBreakdownList.innerHTML = '';
        
        // Get all tasks with time spent today
        const tasksWithTime = [];
        for (const taskId in todayStats.taskTimes) {
            const task = tasks.find(t => t.id === Number(taskId) || t.id === taskId);
            if (task) {
                const timeSpent = todayStats.taskTimes[taskId];
                const minutesSpent = Math.ceil(timeSpent / 60);
                tasksWithTime.push({
                    text: task.text,
                    time: minutesSpent,
                    completed: task.completed
                });
            }
        }
        
        // Update the task breakdown list
        tasksWithTime.forEach(taskData => {
            const li = document.createElement('li');
            const statusIcon = taskData.completed ? '✓' : '○';
            const statusClass = taskData.completed ? 'completed-status' : 'pending-status';
            li.innerHTML = `<span class="${statusClass}">${statusIcon}</span> ${taskData.text}: ${taskData.time} minutes`;
            taskBreakdownList.appendChild(li);
        });
    }
    
    // Update completed tasks count if the element exists
    if (completedTasksCount) {
        completedTasksCount.textContent = tasks.filter(t => t.completed).length;
    }
}

// Event Listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Request notification permission on page load
if ('Notification' in window) {
    Notification.requestPermission();
}

// Initialize the app
function init() {
    loadData();
    updateDisplay();
    
    // Set up service worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
}

// Start the app
init();

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
let tasks = [];
let currentTask = null;
let taskTimes = {}; // To track time spent on each task

// Load data from localStorage
function loadData() {
    const savedTasks = localStorage.getItem('pomodoroTasks');
    const savedSessions = localStorage.getItem('pomodoroSessions');
    const savedTaskTimes = localStorage.getItem('pomodoroTaskTimes');
    
    if (savedTasks) tasks = JSON.parse(savedTasks);
    if (savedSessions) sessionsCompleted = parseInt(savedSessions, 10);
    if (savedTaskTimes) taskTimes = JSON.parse(savedTaskTimes);
    
    updateTaskList();
    updateReport();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
    localStorage.setItem('pomodoroSessions', sessionsCompleted.toString());
    localStorage.setItem('pomodoroTaskTimes', JSON.stringify(taskTimes));
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
                timerSound.play();
                showNotification(
                    isWorkTime ? 'Work session completed!' : 'Break time is over!',
                    isWorkTime ? 'Time for a break!' : 'Back to work!'
                );
                
                if (isWorkTime) {
                    // Record time spent on current task
                    if (currentTask) {
                        const taskId = currentTask.id;
                        taskTimes[taskId] = (taskTimes[taskId] || 0) + workDuration;
                        saveData();
                    }
                    
                    sessionsCompleted++;
                    sessionCount.textContent = `${sessionsCompleted}/4`;
                    
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

// Pause the timer
function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
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
    startTimer();
}

// Start a break (short or long)
function startBreak(isLongBreak = false) {
    isWorkTime = false;
    currentTime = isLongBreak ? longBreakDuration : shortBreakDuration;
    updateDisplay();
    document.body.style.backgroundColor = '#f0f8ff';
    startTimer();
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
        
        const taskText = document.createElement('span');
        taskText.textContent = task.text;
        taskText.onclick = () => setCurrentTask(task);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => deleteTask(task.id, e);
        
        li.appendChild(taskText);
        li.appendChild(deleteBtn);
        tasksList.appendChild(li);
    });
}

// Update the report section
function updateReport() {
    // Calculate total work time in minutes
    const today = new Date().toISOString().split('T')[0];
    let totalMinutes = 0;
    const todayTasks = [];
    
    // Filter tasks for today and calculate total time
    tasks.forEach(task => {
        const taskDate = new Date(task.createdAt).toISOString().split('T')[0];
        if (taskDate === today) {
            const taskId = task.id;
            const taskTime = Math.floor((taskTimes[taskId] || 0) / 60); // Convert to minutes
            totalMinutes += taskTime;
            
            if (taskTime > 0) {
                todayTasks.push({
                    text: task.text,
                    time: taskTime
                });
            }
        }
    });
    
    // Update the UI
    totalWorkTime.textContent = totalMinutes;
    completedTasksCount.textContent = tasks.filter(t => t.completed).length;
    
    // Update task breakdown
    taskBreakdownList.innerHTML = '';
    todayTasks.forEach(task => {
        const li = document.createElement('li');
        li.textContent = `${task.text}: ${task.time} minutes`;
        taskBreakdownList.appendChild(li);
    });
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

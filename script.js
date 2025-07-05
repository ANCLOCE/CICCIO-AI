class TaskAIAgent {
    constructor() {
        this.tasks = [];
        this.recognition = null;
        this.isListening = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSpeechRecognition();
        this.loadTasks();
        this.setDefaultDeadline();
        this.checkReminders();
        
        // Start real-time clock
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
        
        // Check reminders every hour
        setInterval(() => this.checkReminders(), 60 * 60 * 1000);
    }

    initializeElements() {
        this.taskInput = document.getElementById('taskInput');
        this.deadlineInput = document.getElementById('deadlineInput');
        this.addTaskBtn = document.getElementById('addTaskBtn');
        this.speechBtn = document.getElementById('speechBtn');
        this.taskList = document.getElementById('taskList');
        this.taskCount = document.getElementById('taskCount');
        this.reminders = document.getElementById('reminders');
        this.statusMessage = document.getElementById('statusMessage');
        this.archiveList = document.getElementById('archiveList');
        this.archiveCount = document.getElementById('archiveCount');
        this.toggleArchiveBtn = document.getElementById('toggleArchiveBtn');
        this.dateTimeDisplay = document.getElementById('dateTimeDisplay');
    }

    setDefaultDeadline() {
        // Set default deadline to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.deadlineInput.value = tomorrow.toISOString().split('T')[0];
    }

    setupEventListeners() {
        this.addTaskBtn.addEventListener('click', () => this.addTask());
        this.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });
        this.speechBtn.addEventListener('click', () => this.toggleSpeechRecognition());
        this.toggleArchiveBtn.addEventListener('click', () => this.toggleArchiveView());
    }

    updateDateTime() {
        const now = new Date();
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        
        const formattedDateTime = now.toLocaleDateString('en-US', options);
        this.dateTimeDisplay.textContent = formattedDateTime;
    }

    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.speechBtn.textContent = '🔴 Listening...';
                this.speechBtn.classList.add('listening');
                this.showStatus('Listening... Speak your task now', 'success');
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.taskInput.value = transcript;
                this.showStatus(`Heard: "${transcript}"`, 'success');
            };

            this.recognition.onerror = (event) => {
                this.showStatus(`Speech recognition error: ${event.error}`, 'error');
                this.resetSpeechButton();
            };

            this.recognition.onend = () => {
                this.resetSpeechButton();
            };
        } else {
            this.speechBtn.style.display = 'none';
            this.showStatus('Speech recognition not supported in this browser', 'error');
        }
    }

    toggleSpeechRecognition() {
        if (!this.recognition) return;

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    resetSpeechButton() {
        this.isListening = false;
        this.speechBtn.textContent = '🎤 Voice';
        this.speechBtn.classList.remove('listening');
    }

    addTask() {
        const taskText = this.taskInput.value.trim();
        const deadline = this.deadlineInput.value;

        if (!taskText) {
            this.showStatus('Please enter a task', 'error');
            return;
        }

        if (!deadline) {
            this.showStatus('Please select a deadline', 'error');
            return;
        }

        const task = {
            id: Date.now(),
            text: taskText,
            deadline: deadline,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.updateTaskCount();
        this.updateArchiveCount();
        
        // Clear inputs
        this.taskInput.value = '';
        
        this.showStatus(`Task "${taskText}" added successfully!`, 'success');
        this.checkReminders();
    }

    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
        this.renderTasks();
        this.updateTaskCount();
        this.updateArchiveCount();
        this.showStatus('Task deleted', 'success');
        this.checkReminders();
    }

    completeTask(taskId) {
        const task = this.tasks.find(task => task.id === taskId);
        if (task) {
            task.completed = true;
            task.completedAt = new Date().toISOString();
            this.saveTasks();
            this.renderTasks();
            this.renderArchive();
            this.updateTaskCount();
            this.updateArchiveCount();
            this.showStatus('Task completed and archived!', 'success');
            this.checkReminders();
        }
    }

    renderTasks() {
        const activeTasks = this.tasks.filter(task => !task.completed);
        
        if (activeTasks.length === 0) {
            this.taskList.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 4em; margin-bottom: 20px;">📝</div>
                    <h3>No tasks yet</h3>
                    <p>Add your first task using text input or voice command</p>
                </div>
            `;
            return;
        }

        this.taskList.innerHTML = activeTasks.map(task => {
            const deadlineDate = new Date(task.deadline);
            const today = new Date();
            const timeDiff = deadlineDate.getTime() - today.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            let deadlineClass = '';
            let deadlineText = '';
            let reminderBadge = '';
            
            if (daysDiff < 0) {
                deadlineClass = 'overdue';
                deadlineText = `Overdue by ${Math.abs(daysDiff)} day(s)`;
                reminderBadge = '<span class="reminder-badge overdue">⚠️ OVERDUE</span>';
            } else if (daysDiff === 0) {
                deadlineClass = 'today';
                deadlineText = 'Due today';
                reminderBadge = '<span class="reminder-badge today">🔥 DUE TODAY</span>';
            } else if (daysDiff === 1) {
                deadlineClass = 'tomorrow';
                deadlineText = 'Due tomorrow';
                reminderBadge = '<span class="reminder-badge tomorrow">⏰ DUE TOMORROW</span>';
            } else if (daysDiff === 2) {
                deadlineClass = 'soon';
                deadlineText = `Due in ${daysDiff} days`;
                reminderBadge = '<span class="reminder-badge soon">📅 DUE IN 2 DAYS</span>';
            } else {
                deadlineText = `Due in ${daysDiff} days (${deadlineDate.toLocaleDateString()})`;
            }

            return `
                <li class="task-item ${deadlineClass}">
                    <div class="task-content">
                        <div class="task-text">
                            ${task.text}
                            ${reminderBadge}
                        </div>
                        <div class="task-deadline">${deadlineText}</div>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-small btn-complete" onclick="taskAgent.completeTask(${task.id})">
                            ✓ Complete
                        </button>
                        <button class="btn btn-small btn-delete" onclick="taskAgent.deleteTask(${task.id})">
                            🗑 Delete
                        </button>
                    </div>
                </li>
            `;
        }).join('');
    }

    updateTaskCount() {
        const activeTasksCount = this.tasks.filter(task => !task.completed).length;
        this.taskCount.textContent = `${activeTasksCount} task${activeTasksCount !== 1 ? 's' : ''}`;
    }

    updateArchiveCount() {
        const completedTasksCount = this.tasks.filter(task => task.completed).length;
        this.archiveCount.textContent = `${completedTasksCount} completed`;
    }

    toggleArchiveView() {
        const isVisible = this.archiveList.style.display !== 'none';
        
        if (isVisible) {
            this.archiveList.style.display = 'none';
            this.toggleArchiveBtn.textContent = 'Show Archive';
        } else {
            this.archiveList.style.display = 'block';
            this.toggleArchiveBtn.textContent = 'Hide Archive';
            this.renderArchive();
        }
    }

    renderArchive() {
        const completedTasks = this.tasks.filter(task => task.completed);
        
        if (completedTasks.length === 0) {
            this.archiveList.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 4em; margin-bottom: 20px;">📁</div>
                    <h3>No completed tasks yet</h3>
                    <p>Completed tasks will appear here</p>
                </div>
            `;
            return;
        }

        this.archiveList.innerHTML = completedTasks.map(task => {
            const completedDate = task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'Unknown';
            const originalDeadline = new Date(task.deadline).toLocaleDateString();
            
            return `
                <li class="task-item completed">
                    <div class="task-content">
                        <div class="task-text">
                            ${task.text}
                            <span class="completed-status">✓ COMPLETED</span>
                        </div>
                        <div class="task-deadline">Completed: ${completedDate} | Original deadline: ${originalDeadline}</div>
                    </div>
                    <div class="task-actions">
                        <button class="btn btn-small btn-delete" onclick="taskAgent.deleteFromArchive(${task.id})">
                            🗑 Delete Permanently
                        </button>
                    </div>
                </li>
            `;
        }).join('');
    }

    deleteFromArchive(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
        this.renderArchive();
        this.updateArchiveCount();
        this.showStatus('Task permanently deleted from archive', 'success');
    }

    checkReminders() {
        // Clear any existing large reminders since we now use inline reminders
        this.reminders.innerHTML = '';
        
        // The reminder logic is now handled inline within renderTasks()
        // This method is kept for compatibility but no longer displays large reminder boxes
    }

    showStatus(message, type) {
        this.statusMessage.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
        setTimeout(() => {
            this.statusMessage.innerHTML = '';
        }, 3000);
    }

    saveTasks() {
        localStorage.setItem('taskAIAgent_tasks', JSON.stringify(this.tasks));
    }

    loadTasks() {
        const savedTasks = localStorage.getItem('taskAIAgent_tasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
            this.renderTasks();
            this.renderArchive();
            this.updateTaskCount();
            this.updateArchiveCount();
        }
    }
}
// Initialize the app when the page loads
let taskAgent;
let deferredPrompt;

document.addEventListener('DOMContentLoaded', function() {
    taskAgent = new TaskAIAgent();
    
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
    
    // Handle PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later
        deferredPrompt = e;
        // Show install button after a short delay
        setTimeout(showInstallPrompt, 3000);
    });
    
    // Handle successful PWA installation
    window.addEventListener('appinstalled', (evt) => {
        console.log('Ciccio has been installed as a PWA');
        hideInstallPrompt();
    });
});

function showInstallPrompt() {
    if (deferredPrompt && !localStorage.getItem('installPromptDismissed')) {
        const installBanner = document.createElement('div');
        installBanner.id = 'installBanner';
        installBanner.innerHTML = `
            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 15px; text-align: center; position: fixed; top: 0; left: 0; right: 0; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
                <div style="max-width: 600px; margin: 0 auto;">
                    <strong>📱 Install Ciccio</strong><br>
                    <small>Add to your home screen for quick access!</small><br>
                    <button onclick="installApp()" style="background: white; color: #4facfe; border: none; padding: 8px 16px; border-radius: 20px; margin: 5px; cursor: pointer; font-weight: bold;">Install</button>
                    <button onclick="dismissInstallPrompt()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid white; padding: 8px 16px; border-radius: 20px; margin: 5px; cursor: pointer;">Later</button>
                </div>
            </div>
        `;
        document.body.appendChild(installBanner);
    }
}

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
            hideInstallPrompt();
        });
    }
}

function dismissInstallPrompt() {
    localStorage.setItem('installPromptDismissed', 'true');
    hideInstallPrompt();
}

function hideInstallPrompt() {
    const banner = document.getElementById('installBanner');
    if (banner) {
        banner.remove();
    }
}


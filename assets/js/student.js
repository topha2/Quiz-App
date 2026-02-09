// Student Logic

// State
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let attemptId = null;
let isQuizActive = false;

// Mock questions for demo if Supabase is empty or unconnected
const MOCK_QUESTIONS = [
    { id: 1, text: "What is the derivative of x^2?", options: ["x", "2x", "2", "x^2"], correct: "2x" },
    { id: 2, text: "Solve for x: 3x + 5 = 20", options: ["3", "5", "15", "6"], correct: "5" },
    { id: 3, text: "Which principle states that energy cannot be created or destroyed?", options: ["Conservation of Mass", "Conservation of Energy", "Newton's First Law", "Ohm's Law"], correct: "Conservation of Energy" }
];

document.addEventListener('DOMContentLoaded', () => {
    // Auto-init with hardcoded creds
    quizAppDb = initSupabase();

    // Prevent standard cheats
    preventCheats();
});

function preventCheats() {
    // Disable right click
    document.addEventListener('contextmenu', event => event.preventDefault());

    // Disable standard copy/paste keys
    document.addEventListener('keydown', (e) => {
        if (
            e.keyCode === 123 || // F12
            (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
            (e.ctrlKey && e.keyCode === 67) || // Ctrl+C
            (e.ctrlKey && e.keyCode === 86) || // Ctrl+V
            (e.ctrlKey && e.keyCode === 85) // Ctrl+U
        ) {
            e.preventDefault();
        }
    });

    // Visibility Change Listener (The Core Anti-Cheat)
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

async function handleVisibilityChange() {
    if (!isQuizActive) return;

    if (document.hidden) {
        console.log("Tab switched! Disqualifying...");
        isQuizActive = false;

        // UI Update
        document.getElementById('quiz-ui').classList.add('hidden');
        document.getElementById('dq-screen').classList.remove('hidden');

        // Backend Update
        if (quizAppDb && attemptId) {
            await quizAppDb
                .from('attempts')
                .update({
                    status: 'disqualified',
                    completed_at: new Date().toISOString()
                })
                .eq('id', attemptId);
        }
    }
}

async function startQuiz() {
    const name = document.getElementById('student-name-input').value;

    if (!name) return alert("Please enter your name.");

    // Init Supabase if not already
    if (!quizAppDb) {
        quizAppDb = initSupabase();
    }

    // UI Transition
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('student-name-display').innerText = name;

    // Full screen request
    try {
        await document.documentElement.requestFullscreen();
    } catch (e) {
        console.log("Fullscreen denied or not supported");
    }

    // 1. Fetch Latest Quiz
    let quizData = null;
    if (quizAppDb) {
        const { data, error } = await quizAppDb
            .from('quizzes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (data && data.length > 0) quizData = data[0];
    }

    // 2. Create Attempt in DB
    if (quizAppDb && quizData) {
        const { data, error } = await quizAppDb
            .from('attempts')
            .insert([{
                student_name: name,
                status: 'in-progress',
                quiz_id: quizData.id
            }])
            .select();

        if (data && data.length > 0) {
            attemptId = data[0].id;
        } else if (error) {
            console.error("Error creating attempt:", error);
        }
    }

    // 3. Fetch Questions (REAL)
    if (quizAppDb && quizData) {
        const { data: qData } = await quizAppDb
            .from('questions')
            .select('*')
            .eq('quiz_id', quizData.id);

        if (qData && qData.length > 0) {
            currentQuestions = qData;
        } else {
            currentQuestions = MOCK_QUESTIONS;
        }

        // Start Timer
        startTimer(quizData.duration_minutes * 60);

    } else {
        currentQuestions = MOCK_QUESTIONS;
        startTimer(60 * 60); // 1 hour default
    }

    // Start Attempt
    isQuizActive = true;
    document.getElementById('quiz-ui').classList.remove('hidden');

    renderQuestion();
}

let timerInterval;
function startTimer(durationSeconds) {
    let timer = durationSeconds, minutes, seconds;
    const display = document.querySelector('#timer');

    timerInterval = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(timerInterval);
            finishQuiz();
        }
    }, 1000);
}

function renderQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    document.getElementById('current-q').innerText = currentQuestionIndex + 1;
    document.getElementById('total-q').innerText = currentQuestions.length;
    document.getElementById('progress-percent').innerText = Math.round(((currentQuestionIndex) / currentQuestions.length) * 100) + '%';
    document.getElementById('progress-bar').style.width = ((currentQuestionIndex) / currentQuestions.length) * 100 + '%';

    document.getElementById('question-text').innerText = q.text;

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    q.options.forEach((opt, idx) => {
        const letter = String.fromCharCode(65 + idx); // A, B, C...
        const btn = document.createElement('div');
        btn.className = `option-card glass p-4 rounded-xl cursor-pointer border border-white/5 flex items-center gap-4 group`;
        btn.onclick = () => selectOption(idx, opt);
        btn.id = `opt-${idx}`;

        btn.innerHTML = `
            <div class="h-8 w-8 rounded-lg bg-gray-700 group-hover:bg-primary/20 flex items-center justify-center font-bold text-sm text-gray-300 group-hover:text-primary transition-colors">
                ${letter}
            </div>
            <span class="text-gray-200">${opt}</span>
        `;
        container.appendChild(btn);
    });
}

function selectOption(idx, value) {
    // Clear previous selection visually
    document.querySelectorAll('.option-card').forEach(el => {
        el.classList.remove('option-selected');
    });

    // Select new
    document.getElementById(`opt-${idx}`).classList.add('option-selected');
    userAnswers[currentQuestionIndex] = value;
}

async function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        finishQuiz();
    }
}

async function finishQuiz() {
    isQuizActive = false;
    alert("Quiz Submitted!");

    // Calculate Score
    let score = 0;
    currentQuestions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correct) score++;
    });

    // Update DB
    if (quizAppDb && attemptId) {
        await quizAppDb
            .from('attempts')
            .update({
                status: 'completed',
                score: score,
                completed_at: new Date().toISOString()
            })
            .eq('id', attemptId);
    }

    document.getElementById('quiz-ui').innerHTML = `
        <div class="text-center">
            <h2 class="text-3xl font-bold mb-4">Exam Completed</h2>
            <p class="text-xl">Your Score: ${score} / ${currentQuestions.length}</p>
            <p class="text-sm text-gray-500 mt-4">Safe to close window.</p>
        </div>
    `;

    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
}

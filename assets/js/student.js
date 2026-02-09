// Make Quiz - Student Logic

let currentQuiz = null;
let questions = [];
let currentIdx = 0;
let userAnswers = {};
let attemptId = null;
let timerInterval = null;

// Anti-Cheat Variables
let isCheatingDetected = false;

document.addEventListener('DOMContentLoaded', () => {
    // Check URL for Quiz ID
    const urlParams = new URLSearchParams(window.location.search);
    const qid = urlParams.get('id');
    if (!qid) {
        // Fallback to latest quiz if no ID provided for demo
        fetchLatestQuiz();
    } else {
        loadQuizInfo(qid);
    }
});

async function fetchLatestQuiz() {
    const { data } = await quizAppDb.from('quizzes').select('*').order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) {
        currentQuiz = data[0];
    }
}

async function loadQuizInfo(id) {
    const { data } = await quizAppDb.from('quizzes').select('*').eq('id', id).single();
    if (data) currentQuiz = data;
}

function showRules() {
    const name = document.getElementById('student-name').value;
    const email = document.getElementById('student-email').value;

    if (!name || !email) return alert("Name and Email required.");
    if (!email.includes('@')) return alert("Enter a valid Gmail.");
    if (!currentQuiz) return alert("Quiz not found.");

    document.getElementById('rules-modal').classList.remove('hidden');
}

async function confirmStart() {
    const email = document.getElementById('student-email').value;
    const name = document.getElementById('student-name').value;

    // Check ONE-ENTRY Rule
    const { data: existing, error } = await quizAppDb.from('attempts')
        .select('*')
        .eq('quiz_id', currentQuiz.id)
        .eq('student_email', email)
        .single();

    if (existing) {
        alert("Access Denied: You have already attempted this quiz.");
        window.location.href = "index.html";
        return;
    }

    // Create Attempt
    const { data: attempt, error: ae } = await quizAppDb.from('attempts').insert([{
        quiz_id: currentQuiz.id,
        student_email: email,
        student_name: name,
        status: 'in-progress'
    }]).select();

    if (ae) return alert("Failed to start session. Maybe you already tried?");

    attemptId = attempt[0].id;

    // Fetch Questions
    const { data: qData } = await quizAppDb.from('questions').select('*').eq('quiz_id', currentQuiz.id);
    questions = qData || [];

    if (questions.length === 0) {
        alert("This quiz has no questions yet.");
        return;
    }

    // Start UI
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('rules-modal').classList.add('hidden');
    document.getElementById('quiz-screen').classList.remove('hidden');
    document.getElementById('display-name').innerText = name;

    // Enter Fullscreen
    enterFullscreen();
    startAntiCheat();
    startTimer(currentQuiz.duration_minutes * 60);
    renderQuestion();
}

function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
}

function startAntiCheat() {
    // 1. Tab Switching
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && !isCheatingDetected) {
            detectCheating("Tab Switching Detection");
        }
    });

    // 2. Fullscreen Exit
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && !isCheatingDetected) {
            // Give 2 second grace maybe? No, rigid policy.
            detectCheating("Fullscreen Exit");
        }
    });

    // 3. Disable Shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 'i')) {
            e.preventDefault();
        }
    });
    window.addEventListener('contextmenu', e => e.preventDefault());

    // 4. Before Unload (Refresh)
    window.onbeforeunload = function () {
        if (!isCheatingDetected && attemptId) {
            return "Warning: Refreshing will disqualify you.";
        }
    };
}

async function detectCheating(reason) {
    if (isCheatingDetected) return;
    isCheatingDetected = true;

    console.warn("CHEATING DETECTED:", reason);

    // Update Supabase
    await quizAppDb.from('attempts').update({ status: 'disqualified' }).eq('id', attemptId);

    // Show Screen
    document.getElementById('dq-session-id').innerText = attemptId;
    document.getElementById('dq-screen').classList.remove('hidden');
    document.exitFullscreen().catch(() => { });
}

function startTimer(seconds) {
    let left = seconds;
    timerInterval = setInterval(() => {
        left--;
        const m = Math.floor(left / 60);
        const s = left % 60;
        document.getElementById('timer').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;

        if (left <= 0) {
            clearInterval(timerInterval);
            finishQuiz();
        }
    }, 1000);
}

function renderQuestion() {
    const q = questions[currentIdx];
    document.getElementById('question-text').innerText = q.text;

    const list = document.getElementById('options-list');
    list.innerHTML = '';

    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = `w-full text-left p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-primary transition-all font-medium ${userAnswers[currentIdx] === opt ? 'border-primary bg-primary/5' : ''}`;
        btn.innerText = opt;
        btn.onclick = () => selectOption(opt);
        list.appendChild(btn);
    });

    // Progress
    const prog = ((currentIdx + 1) / questions.length) * 100;
    document.getElementById('progress-bar').style.width = prog + '%';
}

function selectOption(opt) {
    userAnswers[currentIdx] = opt;
    renderQuestion();

    // Auto next after slight delay
    setTimeout(() => {
        if (currentIdx < questions.length - 1) {
            currentIdx++;
            renderQuestion();
        } else {
            // Confirm finish
            if (confirm("This is the last question. Finish assessment?")) {
                finishQuiz();
            }
        }
    }, 500);
}

async function finishQuiz() {
    if (isCheatingDetected) return;

    clearInterval(timerInterval);

    // Calculate Score
    let correct = 0;
    questions.forEach((q, idx) => {
        if (userAnswers[idx] === q.correct_answer) correct++;
    });

    const scorePct = Math.round((correct / questions.length) * 100);

    // Update Supabase
    await quizAppDb.from('attempts').update({
        status: 'completed',
        score: scorePct,
        completed_at: new Date().toISOString()
    }).eq('id', attemptId);

    document.getElementById('final-score').innerText = scorePct + '%';
    document.getElementById('result-screen').classList.remove('hidden');
    document.exitFullscreen().catch(() => { });
}

// Make Quiz - Teacher Logic

let attempts = [];
let currentQuizId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase Client
    quizAppDb = initSupabase();

    if (!quizAppDb) {
        console.error("Supabase could not be initialized.");
        alert("Critical: Database connection failed. Please refresh.");
    } else {
        console.log("Teacher: Database connected successfully.");
        startMonitoring();
    }
});

function startMonitoring() {
    console.log("Teacher: Monitoring started.");
    loadAvailableQuizzes();

    // Subscribe to REALTIME
    quizAppDb.channel('public:attempts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts' }, payload => {
            handleRealtime(payload);
        })
        .subscribe();
}

async function loadAvailableQuizzes() {
    const selector = document.getElementById('quiz-selector');
    const { data, error } = await quizAppDb.from('quizzes').select('*').order('created_at', { ascending: false });

    if (data) {
        selector.innerHTML = '';
        data.forEach((q, idx) => {
            const opt = document.createElement('option');
            opt.value = q.id;
            opt.innerText = q.title + (idx === 0 ? " (Latest)" : "");
            selector.appendChild(opt);
        });

        if (currentQuizId) {
            selector.value = currentQuizId;
        }

        // Auto select latest if none selected
        if (!currentQuizId && data.length > 0) {
            currentQuizId = data[0].id;
            selector.value = currentQuizId;
            fetchAttempts(currentQuizId);
        }
    }
}

function changeMonitoredQuiz(id) {
    currentQuizId = id;
    fetchAttempts(id);
}

async function fetchAttempts(quizId) {
    if (!quizId) return;
    const { data, error } = await quizAppDb.from('attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .order('started_at', { ascending: false });

    if (data) {
        attempts = data;
        renderDashboard();
    }
}

function handleRealtime(payload) {
    const { eventType, new: newRec } = payload;

    // Safety check: Only care about updates for the CURRENTLY SELECTED quiz
    if (newRec.quiz_id !== currentQuizId) return;

    if (eventType === 'INSERT') {
        attempts.unshift(newRec);
    } else if (eventType === 'UPDATE') {
        const idx = attempts.findIndex(a => a.id === newRec.id);
        if (idx !== -1) attempts[idx] = newRec;
    }
    renderDashboard();
}

function renderDashboard() {
    const grid = document.getElementById('students-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const active = attempts.filter(a => a.status === 'in-progress').length;
    const fin = attempts.filter(a => a.status === 'completed').length;
    const dq = attempts.filter(a => a.status === 'disqualified').length;

    document.getElementById('stat-active').innerText = active;
    document.getElementById('stat-completed').innerText = fin;
    document.getElementById('stat-disqualified').innerText = dq;

    if (attempts.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-20 text-center opacity-50">No students joined yet.</div>';
        return;
    }

    attempts.forEach(a => {
        const card = document.createElement('div');
        const statusClass = a.status === 'disqualified' ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/10' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';

        card.className = `p-6 rounded-2xl border shadow-sm ${statusClass} transition-all`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="font-bold text-lg">${a.student_name}</h4>
                    <p class="text-xs font-medium text-slate-500">${a.student_email}</p>
                </div>
                <span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${getStatusBadge(a.status)}">${a.status}</span>
            </div>
            <div class="flex items-end justify-between">
                <div>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">Score</p>
                    <p class="text-xl font-black">${a.score}%</p>
                </div>
                <p class="text-[10px] text-slate-400 font-mono">${new Date(a.started_at).toLocaleTimeString()}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function getStatusBadge(s) {
    if (s === 'in-progress') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600';
    if (s === 'completed') return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600';
    return 'bg-rose-100 dark:bg-rose-900/30 text-rose-600';
}

// Tabs
function switchTab(t) {
    document.getElementById('view-monitor').classList.add('hidden');
    document.getElementById('view-create').classList.add('hidden');
    document.getElementById('tab-monitor').className = "px-6 py-3 font-medium border-b-2 border-transparent text-slate-500";
    document.getElementById('tab-create').className = "px-6 py-3 font-medium border-b-2 border-transparent text-slate-500";

    document.getElementById(`view-${t}`).classList.remove('hidden');
    document.getElementById(`tab-${t}`).className = "px-6 py-3 font-medium border-b-2 border-primary text-primary";
}

// Quiz Creation
function addQuestionField() {
    const container = document.getElementById('questions-container');
    const idx = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "question-entry p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 relative";
    div.innerHTML = `
        <div class="mb-4">
            <label class="block text-xs font-bold text-slate-400 mb-1">Question ${idx}</label>
            <input type="text" class="q-text w-full bg-transparent border-b-2 border-slate-200 dark:border-slate-700 p-2 outline-none focus:border-primary font-medium" placeholder="Next question...">
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
            <input type="text" class="q-opt w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm" placeholder="Option 0">
            <input type="text" class="q-opt w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm" placeholder="Option 1">
            <input type="text" class="q-opt w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm" placeholder="Option 2">
            <input type="text" class="q-opt w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm" placeholder="Option 3">
        </div>
        <div>
             <label class="block text-xs font-bold text-slate-400 mb-1">Correct Answer Index (0-3)</label>
             <input type="number" class="q-correct w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm" min="0" max="3" value="0">
        </div>
    `;
    container.appendChild(div);
}

async function publishQuiz() {
    const btn = document.getElementById('btn-publish');
    const title = document.getElementById('quiz-title').value;
    const duration = document.getElementById('quiz-duration').value;

    if (!title) return alert("Enter Quiz Title");

    btn.disabled = true;
    btn.innerText = "Publishing...";

    try {
        const { data: quiz, error: qe } = await quizAppDb.from('quizzes').insert([{ title, duration_minutes: parseInt(duration) }]).select();
        if (qe) throw qe;

        const qId = quiz[0].id;
        const qItems = document.querySelectorAll('.question-entry');
        const questionsBatch = [];

        qItems.forEach(item => {
            const text = item.querySelector('.q-text').value;
            const options = Array.from(item.querySelectorAll('.q-opt')).map(i => i.value);
            const correctIdx = item.querySelector('.q-correct').value;

            if (text && options[0]) {
                questionsBatch.push({
                    quiz_id: qId,
                    text: text,
                    options: options,
                    correct_answer: options[correctIdx] || options[0]
                });
            }
        });

        const { error: matchError } = await quizAppDb.from('questions').insert(questionsBatch);
        if (matchError) throw matchError;

        // NEW: Load the new quiz into the selector and switch dashboard to it
        currentQuizId = qId;
        await loadAvailableQuizzes();
        switchTab('monitor');

        const shareUrl = `${window.location.origin}${window.location.pathname.replace('teacher.html', 'quiz.html')}?id=${qId}`;
        document.getElementById('share-url').value = shareUrl;
        document.getElementById('share-link-box').classList.remove('hidden');

        alert("Quiz Published Successfully!");
    } catch (e) {
        console.error("Detailed Error:", e);
        alert("Save failed: " + (e.message || "Unknown Error"));
    } finally {
        btn.disabled = false;
        btn.innerText = "Publish & Save";
    }
}

function copyLink() {
    const input = document.getElementById('share-url');
    input.select();
    document.execCommand('copy');
    alert("Share link copied!");
}

function exportReport() {
    if (attempts.length === 0) return;
    let csv = "Name,Email,Status,Score,Date\n";
    attempts.forEach(a => {
        csv += `"${a.student_name}","${a.student_email}","${a.status}",${a.score},"${a.started_at}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'reports.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

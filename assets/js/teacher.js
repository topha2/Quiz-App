// Teacher Dashboard Logic

let attempts = [];

document.addEventListener('DOMContentLoaded', () => {
    quizAppDb = initSupabase();
    if (quizAppDb) {
        startMonitoring();
    }
});



function startMonitoring() {
    fetchExistingAttempts();
    subscribeToRealtime();
}

async function fetchExistingAttempts() {
    const { data, error } = await quizAppDb
        .from('attempts')
        .select('*')
        .order('started_at', { ascending: false });

    if (data) {
        attempts = data;
        updateDashboard();
    }
}

function subscribeToRealtime() {
    // Listen to ALL changes on 'attempts' table
    quizAppDb
        .channel('public:attempts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts' }, payload => {
            console.log('Change received!', payload);
            handleRealtimeUpdate(payload);
        })
        .subscribe();
}

function handleRealtimeUpdate(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT') {
        attempts.unshift(newRecord);
    } else if (eventType === 'UPDATE') {
        const index = attempts.findIndex(a => a.id === newRecord.id);
        if (index !== -1) attempts[index] = newRecord;
    }

    updateDashboard();
}

let currentFilter = 'all';

function filterStudents(status) {
    currentFilter = status;
    updateDashboard();
}

function exportReport() {
    if (attempts.length === 0) return alert("No data to export.");

    // CSV Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student Name,Email,Status,Score,Time Active,Started At\n";

    // CSV Rows
    attempts.forEach(row => {
        const timeActive = getTimeActive(row.started_at, row.completed_at);
        const rowString = `"${row.student_name}","${row.student_email || 'N/A'}","${row.status}",${row.score},"${timeActive}","${row.started_at}"`;
        csvContent += rowString + "\n";
    });

    // Download Trigger
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "exam_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function updateDashboard() {
    const grid = document.getElementById('students-grid');
    grid.innerHTML = '';

    // Filter Logic
    let displayAttempts = attempts;
    if (currentFilter !== 'all') {
        displayAttempts = attempts.filter(a => a.status === currentFilter);
    }

    // Update Stats (Always based on TOTAL attempts, not filtered)
    const active = attempts.filter(a => a.status === 'in-progress').length;
    const completed = attempts.filter(a => a.status === 'completed').length;
    const dq = attempts.filter(a => a.status === 'disqualified').length;

    // safe division
    const totalScored = attempts.filter(a => a.score != null && a.status === 'completed');
    const avgScore = totalScored.length ? Math.round(totalScored.reduce((acc, curr) => acc + curr.score, 0) / totalScored.length) : 0;

    document.getElementById('stat-active').innerText = active;
    document.getElementById('stat-completed').innerText = completed;
    document.getElementById('stat-disqualified').innerText = dq;
    document.getElementById('stat-avg').innerText = avgScore;

    // Render Cards
    if (displayAttempts.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">No students found with this status.</div>';
    } else {
        displayAttempts.forEach(attempt => {
            const card = createStudentCard(attempt);
            grid.appendChild(card);
        });
    }
}

function createStudentCard(attempt) {
    const div = document.createElement('div');

    // Status Styles
    let statusColor = 'text-gray-400';
    let statusBg = 'bg-gray-500/10';
    let icon = '';

    if (attempt.status === 'in-progress') {
        statusColor = 'text-green-400';
        statusBg = 'bg-green-500/10';
        icon = '<span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>';
    } else if (attempt.status === 'disqualified') {
        statusColor = 'text-red-500';
        statusBg = 'bg-red-500/10';
        icon = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
    } else if (attempt.status === 'completed') {
        statusColor = 'text-blue-400';
        statusBg = 'bg-blue-500/10';
        icon = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>';
    }

    div.className = `group relative overflow-hidden rounded-2xl bg-gray-900/50 backdrop-blur-xl border border-white/10 p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-primary/30 ${attempt.status === 'disqualified' ? 'border-red-500/30 bg-red-900/10' : ''}`;

    div.innerHTML = `
        <!-- Status Indicator Dot -->
        <div class="absolute top-4 right-4">
            <div class="flex items-center gap-2 px-3 py-1 rounded-full ${statusBg} border border-white/5 backdrop-blur-md shadow-lg">
                ${icon}
                <span class="${statusColor} text-xs font-bold uppercase tracking-wider">${attempt.status}</span>
            </div>
        </div>

        <div class="flex items-center gap-4 mb-6">
             <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center shadow-inner group-hover:from-primary/20 group-hover:to-purple-500/20 transition-all duration-500">
                <span class="text-2xl font-bold text-white">${attempt.student_name.charAt(0)}</span>
             </div>
             <div>
                <h3 class="font-bold text-white text-xl tracking-tight group-hover:text-primary transition-colors">${attempt.student_name}</h3>
                <p class="text-xs text-gray-500 font-mono flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    ID: ${attempt.id.substring(0, 8)}
                </p>
             </div>
        </div>
        
        <div class="grid grid-cols-2 gap-3 mb-2">
             <div class="bg-white/5 rounded-xl p-3 border border-white/5">
                <span class="text-gray-400 text-xs block mb-1">Current Score</span>
                <span class="text-2xl font-bold text-white font-mono">${attempt.score !== null ? attempt.score : '-'}</span>
            </div>
            <div class="bg-white/5 rounded-xl p-3 border border-white/5">
                <span class="text-gray-400 text-xs block mb-1">Time Active</span>
                <span class="text-white font-bold font-mono">
                    ${getTimeActive(attempt.started_at, attempt.completed_at)}
                </span>
            </div>
        </div>
        
        ${attempt.status === 'in-progress' ? `
            <div class="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600 opacity-50">
                <div class="h-full w-full animate-pulse bg-white/20"></div>
            </div>
        ` : ''}
    `;

    return div;
}

// Tabs
function switchTab(tab) {
    document.getElementById('view-monitor').classList.add('hidden');
    document.getElementById('view-create').classList.add('hidden');

    document.getElementById('tab-monitor').classList.remove('border-primary', 'text-primary');
    document.getElementById('tab-create').classList.remove('border-primary', 'text-primary');
    document.getElementById('tab-monitor').classList.add('border-transparent');
    document.getElementById('tab-create').classList.add('border-transparent');

    document.getElementById(`view-${tab}`).classList.remove('hidden');
    document.getElementById(`tab-${tab}`).classList.add('border-primary', 'text-primary');
    document.getElementById(`tab-${tab}`).classList.remove('border-transparent');
}

// Creation Logic
function addQuestionUI() {
    const list = document.getElementById('questions-list');
    const count = list.children.length + 1;
    const div = document.createElement('div');
    div.className = 'question-item p-6 rounded-xl bg-white/5 border border-white/10 relative';
    div.innerHTML = `
        <span class="absolute top-4 right-4 text-xs text-gray-500 font-mono">Q${count}</span>
        <div class="mb-4">
            <label class="block text-xs font-medium text-gray-500 mb-1">Question Text</label>
            <input type="text" class="q-text w-full bg-transparent border-b border-gray-700 p-2 text-white focus:border-primary outline-none" placeholder="Enter question here...">
        </div>
        <div class="grid grid-cols-2 gap-4 mb-4">
            <input type="text" class="q-opt-a w-full bg-dark-light/50 border border-gray-700 rounded p-2 text-sm text-white" placeholder="Option A">
            <input type="text" class="q-opt-b w-full bg-dark-light/50 border border-gray-700 rounded p-2 text-sm text-white" placeholder="Option B">
            <input type="text" class="q-opt-c w-full bg-dark-light/50 border border-gray-700 rounded p-2 text-sm text-white" placeholder="Option C">
            <input type="text" class="q-opt-d w-full bg-dark-light/50 border border-gray-700 rounded p-2 text-sm text-white" placeholder="Option D">
        </div>
            <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Correct Answer</label>
                <select class="q-correct w-full bg-dark-light border border-gray-700 rounded p-2 text-sm text-white">
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                </select>
        </div>
    `;
    list.appendChild(div);
}

async function publishQuiz() {
    if (!quizAppDb) return alert("Database not connected!");

    const title = document.getElementById('new-quiz-title').value;
    const duration = document.getElementById('new-quiz-duration').value;
    const type = document.getElementById('new-quiz-type').value;

    if (!title) return alert("Please enter a quiz title");

    // 1. Create Quiz
    const { data: quizData, error: quizError } = await quizAppDb
        .from('quizzes')
        .insert([{ title: title, duration_minutes: parseInt(duration), type: type }])
        .select();

    if (quizError) {
        console.error(quizError);
        return alert("Error creating quiz");
    }

    const quizId = quizData[0].id;

    // 2. Gather Questions
    const questionItems = document.querySelectorAll('.question-item');
    const questionsToInsert = [];

    questionItems.forEach(item => {
        const text = item.querySelector('.q-text').value;
        const optA = item.querySelector('.q-opt-a').value;
        const optB = item.querySelector('.q-opt-b').value;
        const optC = item.querySelector('.q-opt-c').value;
        const optD = item.querySelector('.q-opt-d').value;
        const correctLetter = item.querySelector('.q-correct').value; // "A", "B"...

        let correctVal = "";
        if (correctLetter === "A") correctVal = optA;
        if (correctLetter === "B") correctVal = optB;
        if (correctLetter === "C") correctVal = optC;
        if (correctLetter === "D") correctVal = optD;

        if (text && optA) {
            questionsToInsert.push({
                quiz_id: quizId,
                text: text,
                options: [optA, optB, optC, optD],
                correct_answer: correctVal
            });
        }
    });

    // 3. Insert Questions
    const { error: matchError } = await quizAppDb.from('questions').insert(questionsToInsert);

    if (matchError) {
        console.error(matchError);
        alert("Quiz created but failed to save questions.");
    } else {
        alert("Quiz Published Successfully!");
        location.reload();
    }
}

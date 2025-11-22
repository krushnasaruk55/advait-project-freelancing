// Flashcards Page JavaScript
let currentStudyIndex = 0;
let studyCards = [];
let editingCardId = null;
let uploadedFileContent = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderFlashcards();
    updateCount();
    setupEventListeners();
    setupDocumentUpload();
});

function setupEventListeners() {
    document.getElementById('generateBtn').addEventListener('click', generateFlashcards);
    document.getElementById('topicInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') generateFlashcards();
    });
    document.getElementById('configAIBtn').addEventListener('click', () => openAPIConfig('deepseek'));
    document.getElementById('categoryFilter').addEventListener('change', filterFlashcards);
    document.getElementById('studyModeBtn').addEventListener('click', openStudyMode);
    document.getElementById('prevCardBtn').addEventListener('click', previousCard);
    document.getElementById('nextCardBtn').addEventListener('click', nextCard);
    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
}

// Tab Switching
function switchTab(tab) {
    const topicTab = document.getElementById('topicTab');
    const documentTab = document.getElementById('documentTab');
    const topicSection = document.getElementById('topicInputSection');
    const documentSection = document.getElementById('documentUploadSection');

    if (tab === 'topic') {
        topicTab.classList.add('active');
        documentTab.classList.remove('active');
        topicSection.style.display = 'block';
        documentSection.style.display = 'none';
    } else {
        topicTab.classList.remove('active');
        documentTab.classList.add('active');
        topicSection.style.display = 'none';
        documentSection.style.display = 'block';
    }
}

// Setup Document Upload
function setupDocumentUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const processBtn = document.getElementById('processDocBtn');

    // Click to upload
    dropZone.addEventListener('click', (e) => {
        if (e.target.id !== 'fileInput' && !e.target.classList.contains('btn')) {
            fileInput.click();
        }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary)';
        dropZone.style.background = 'var(--primary-lighter)';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-medium)';
        dropZone.style.background = 'var(--bg-secondary)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-medium)';
        dropZone.style.background = 'var(--bg-secondary)';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // File selection
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Process document
    if (processBtn) {
        processBtn.addEventListener('click', processDocument);
    }
}

// Handle File Upload
function handleFile(file) {
    const validTypes = ['.txt', '.md'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(fileExtension)) {
        showToast('Please upload a .txt or .md file', 'error');
        return;
    }

    // Show file info
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileInfo').style.display = 'block';

    // Read file
    const reader = new FileReader();

    reader.onload = function (e) {
        uploadedFileContent = e.target.result;
        showToast('Document loaded! Click "Generate Flashcards"', 'success');
    };

    reader.onerror = function () {
        showToast('Error reading file. Please try again.', 'error');
    };

    reader.readAsText(file);
}

// Process Document
async function processDocument() {
    if (!uploadedFileContent) {
        showToast('No document loaded', 'error');
        return;
    }

    const btn = document.getElementById('processDocBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

    try {
        await generateFlashcardsFromDocument(uploadedFileContent);

        // Clear upload
        uploadedFileContent = null;
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('fileInput').value = '';

        // Switch to topic tab to show results
        switchTab('topic');

        renderFlashcards();
        updateCount();
    } catch (error) {
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic"></i> Generate Flashcards';
    }
}

// Generate Flashcards from Document
async function generateFlashcardsFromDocument(content) {
    showToast('AI is analyzing your document...', 'success');

    try {
        const response = await callDeepSeekAPI([
            {
                role: 'system',
                content: 'You are a helpful study assistant. Read the provided document/text and generate 10 comprehensive flashcard questions and answers covering the key concepts. Format EXACTLY as: QUESTION: [question text]\\nANSWER: [answer text]\\n\\n (with double line break between each card)'
            },
            {
                role: 'user',
                content: `Read this document and create 10 flashcards covering the main topics and key concepts:\\n\\n${content.substring(0, 8000)}`
            }
        ], 0.7, 2000);

        // Parse flashcards
        const flashcardMatches = response.match(/QUESTION:\\s*(.*?)\\s*ANSWER:\\s*(.*?)(?=QUESTION:|$)/gs);

        if (!flashcardMatches || flashcardMatches.length === 0) {
            throw new Error('Could not parse flashcards from document');
        }

        const newFlashcards = [];
        flashcardMatches.forEach(match => {
            const questionMatch = match.match(/QUESTION:\\s*(.*?)\\s*ANSWER:/s);
            const answerMatch = match.match(/ANSWER:\\s*(.*?)$/s);

            if (questionMatch && answerMatch) {
                const question = questionMatch[1].trim();
                const answer = answerMatch[1].trim();

                if (question && answer) {
                    newFlashcards.push({
                        id: generateId(),
                        question,
                        answer,
                        category: 'Other',
                        topic: 'Document Upload',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }
            }
        });

        if (newFlashcards.length > 0) {
            const allFlashcards = AppState.flashcards;
            AppState.flashcards = [...newFlashcards, ...allFlashcards];
            showToast(`Generated ${newFlashcards.length} flashcards from your document!`, 'success');
        } else {
            throw new Error('No flashcards generated');
        }

    } catch (error) {
        console.error('Document analysis error:', error);
        showToast('Failed to analyze document. Try again.', 'error');
    }
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Generate Flashcards from Topic
async function generateFlashcards() {
    const topic = document.getElementById('topicInput').value.trim();

    if (!topic) {
        showToast('Please enter a topic', 'error');
        return;
    }

    const btn = document.getElementById('generateBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    try {
        await generateFlashcardsAI(topic);
        document.getElementById('topicInput').value = '';
        renderFlashcards();
        updateCount();
    } catch (error) {
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic"></i> Generate Flashcards';
    }
}

// Render Flashcards
function renderFlashcards(filtered = null) {
    const grid = document.getElementById('flashcardsGrid');
    const cards = filtered !== null ? filtered : AppState.flashcards;

    if (cards.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-magic"></i>
                <p>No flashcards yet!</p>
                <small>Enter a topic or upload a document to generate flashcards</small>
            </div>
        `;
        return;
    }

    grid.innerHTML = cards.map(card => `
        <div class="flashcard" data-id="${card.id}">
            <div class="flashcard-front">
                <span class="flashcard-category">${escapeHtml(card.category)}</span>
                <div class="flashcard-content">
                    <p class="flashcard-question">${escapeHtml(card.question)}</p>
                </div>
                <div class="flashcard-actions">
                    <button class="btn btn-secondary btn-sm" onclick="flipCard('${card.id}')">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="editCard('${card.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteCard('${card.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="flashcard-back">
                <span class="flashcard-category">${escapeHtml(card.category)}</span>
                <div class="flashcard-content">
                    <p class="flashcard-answer">${escapeHtml(card.answer)}</p>
                </div>
                <div class="flashcard-actions">
                    <button class="btn btn-secondary btn-sm" onclick="flipCard('${card.id}')">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="editCard('${card.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteCard('${card.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Flashcard Actions
function flipCard(id) {
    const card = document.querySelector(`.flashcard[data-id="${id}"]`);
    if (card) card.classList.toggle('flipped');
}

function editCard(id) {
    const cards = AppState.flashcards;
    const card = cards.find(c => c.id === id);
    if (!card) return;

    editingCardId = id;
    document.getElementById('editQuestion').value = card.question;
    document.getElementById('editAnswer').value = card.answer;
    openModal('editModal');
}

function saveEdit() {
    if (!editingCardId) return;

    const question = document.getElementById('editQuestion').value.trim();
    const answer = document.getElementById('editAnswer').value.trim();

    if (!question || !answer) {
        showToast('Please fill in both fields', 'error');
        return;
    }

    const cards = AppState.flashcards;
    const index = cards.findIndex(c => c.id === editingCardId);

    if (index !== -1) {
        cards[index].question = question;
        cards[index].answer = answer;
        cards[index].updatedAt = new Date().toISOString();
        AppState.flashcards = cards;

        renderFlashcards();
        closeModal('editModal');
        showToast('Flashcard updated!', 'success');
    }
}

function deleteCard(id) {
    if (!confirm('Delete this flashcard?')) return;

    const cards = AppState.flashcards;
    AppState.flashcards = cards.filter(c => c.id !== id);
    renderFlashcards();
    updateCount();
    showToast('Flashcard deleted', 'success');
}

function filterFlashcards() {
    const filter = document.getElementById('categoryFilter').value;
    const cards = AppState.flashcards;

    if (filter === 'all') {
        renderFlashcards();
    } else {
        const filtered = cards.filter(c => c.category === filter);
        renderFlashcards(filtered);
    }
}

function updateCount() {
    document.getElementById('flashcardCount').textContent = AppState.flashcards.length;
}

// Study Mode
function openStudyMode() {
    const cards = AppState.flashcards;

    if (cards.length === 0) {
        showToast('No flashcards to study!', 'error');
        return;
    }

    studyCards = [...cards];
    currentStudyIndex = 0;
    openModal('studyModal');
    renderStudyCard();
}

function renderStudyCard() {
    const container = document.getElementById('studyCardContainer');
    const progress = document.getElementById('studyProgress');
    const card = studyCards[currentStudyIndex];

    if (!card) return;

    container.innerHTML = `
        <div class="card" style="cursor: pointer; min-height: 300px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 3rem; max-width: 600px; width: 100%; background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%); border: 2px solid var(--primary);" onclick="this.dataset.flipped = this.dataset.flipped === 'true' ? 'false' : 'true'; if (this.dataset.flipped === 'true') { this.querySelector('.study-side').textContent = 'ANSWER'; this.querySelector('.study-text').textContent = '${escapeHtml(card.answer)}'; } else { this.querySelector('.study-side').textContent = 'QUESTION'; this.querySelector('.study-text').textContent = '${escapeHtml(card.question)}'; }" data-flipped="false">
            <div class="study-side" style="font-size: 0.875rem; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1.5rem;">QUESTION</div>
            <div class="study-text" style="font-size: 1.5rem; color: var(--text-primary); line-height: 1.6; font-weight: 600;">${escapeHtml(card.question)}</div>
            <p style="margin-top: 2rem; font-size: 0.875rem; color: var(--text-secondary);">
                <i class="fas fa-hand-pointer"></i> Click to flip
            </p>
        </div>
    `;

    progress.textContent = `${currentStudyIndex + 1} / ${studyCards.length}`;
}

function previousCard() {
    if (currentStudyIndex > 0) {
        currentStudyIndex--;
        renderStudyCard();
    }
}

function nextCard() {
    if (currentStudyIndex < studyCards.length - 1) {
        currentStudyIndex++;
        renderStudyCard();
    } else {
        showToast('Study session completed! 🎉', 'success');
        closeModal('studyModal');
    }
}

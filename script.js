// ==================== Application State ====================
const AppState = {
    flashcards: [],
    posts: [],
    apiKeys: {
        youtube: '',
        deepseek: ''
    },
    currentStudyIndex: 0,
    currentStudyCards: [],
    chatHistory: []
};

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadStoredData();
    setupEventListeners();
    updateStats();
});

function initializeApp() {
    console.log('🎓 StudyHub initialized');

    // Setup smooth scrolling for navigation
    setupSmoothScroll();

    // Setup navbar scroll effect
    setupNavbarScroll();
}

function loadStoredData() {
    // Load flashcards from localStorage
    const storedFlashcards = localStorage.getItem('studyhub_flashcards');
    if (storedFlashcards) {
        AppState.flashcards = JSON.parse(storedFlashcards);
        renderFlashcards();
    }

    // Load posts from localStorage
    const storedPosts = localStorage.getItem('studyhub_posts');
    if (storedPosts) {
        AppState.posts = JSON.parse(storedPosts);
        renderPosts();
    }

    // Load API keys from localStorage
    const storedKeys = localStorage.getItem('studyhub_apikeys');
    if (storedKeys) {
        AppState.apiKeys = JSON.parse(storedKeys);
    }

    // Load chat history
    const storedChat = localStorage.getItem('studyhub_chat');
    if (storedChat) {
        AppState.chatHistory = JSON.parse(storedChat);
        renderChatHistory();
    }
}

function saveData(type) {
    switch (type) {
        case 'flashcards':
            localStorage.setItem('studyhub_flashcards', JSON.stringify(AppState.flashcards));
            break;
        case 'posts':
            localStorage.setItem('studyhub_posts', JSON.stringify(AppState.posts));
            break;
        case 'apikeys':
            localStorage.setItem('studyhub_apikeys', JSON.stringify(AppState.apiKeys));
            break;
        case 'chat':
            localStorage.setItem('studyhub_chat', JSON.stringify(AppState.chatHistory));
            break;
    }
    updateStats();
}

// ==================== Event Listeners ====================
function setupEventListeners() {
    // Navigation
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    navToggle?.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('href').substring(1);
            scrollToSection(target);
            navMenu.classList.remove('active');

            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Flashcard events
    document.getElementById('createFlashcardBtn')?.addEventListener('click', openFlashcardModal);
    document.getElementById('saveFlashcardBtn')?.addEventListener('click', saveFlashcard);
    document.getElementById('studyModeBtn')?.addEventListener('click', openStudyMode);
    document.getElementById('categoryFilter')?.addEventListener('change', filterFlashcards);

    // Video events
    document.getElementById('searchVideosBtn')?.addEventListener('click', searchVideos);
    document.getElementById('videoSearchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchVideos();
    });
    document.getElementById('configYouTubeBtn')?.addEventListener('click', () => openAPIConfig('youtube'));

    // AI events
    document.getElementById('sendMessageBtn')?.addEventListener('click', sendAIMessage);
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAIMessage();
        }
    });
    document.getElementById('configAIBtn')?.addEventListener('click', () => openAPIConfig('deepseek'));
    document.getElementById('generateFlashcardsAIBtn')?.addEventListener('click', generateFlashcardsFromAI);

    // Community events
    document.getElementById('createPostBtn')?.addEventListener('click', openPostModal);
    document.getElementById('savePostBtn')?.addEventListener('click', savePost);
    document.getElementById('communityFilter')?.addEventListener('change', filterPosts);
    document.getElementById('communitySort')?.addEventListener('change', sortPosts);

    // Study mode events
    document.getElementById('prevCardBtn')?.addEventListener('click', previousStudyCard);
    document.getElementById('nextCardBtn')?.addEventListener('click', nextStudyCard);

    // Modal close on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// ==================== Navigation & Scroll ====================
function setupSmoothScroll() {
    // Already handled by CSS scroll-behavior: smooth
}

function setupNavbarScroll() {
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const navHeight = document.getElementById('navbar').offsetHeight;
        const sectionTop = section.offsetTop - navHeight;
        window.scrollTo({
            top: sectionTop,
            behavior: 'smooth'
        });
    }
}

// ==================== Flashcards ====================
function openFlashcardModal(flashcardToEdit = null) {
    const modal = document.getElementById('flashcardModal');
    const questionInput = document.getElementById('flashcardQuestion');
    const answerInput = document.getElementById('flashcardAnswer');
    const categoryInput = document.getElementById('flashcardCategory');

    if (flashcardToEdit) {
        questionInput.value = flashcardToEdit.question;
        answerInput.value = flashcardToEdit.answer;
        categoryInput.value = flashcardToEdit.category;
        modal.dataset.editId = flashcardToEdit.id;
    } else {
        questionInput.value = '';
        answerInput.value = '';
        categoryInput.value = 'Computer Science';
        delete modal.dataset.editId;
    }

    modal.classList.add('active');
}

function saveFlashcard() {
    const modal = document.getElementById('flashcardModal');
    const question = document.getElementById('flashcardQuestion').value.trim();
    const answer = document.getElementById('flashcardAnswer').value.trim();
    const category = document.getElementById('flashcardCategory').value;

    if (!question || !answer) {
        showToast('Please fill in both question and answer', 'error');
        return;
    }

    const editId = modal.dataset.editId;

    if (editId) {
        // Edit existing flashcard
        const index = AppState.flashcards.findIndex(f => f.id === editId);
        if (index !== -1) {
            AppState.flashcards[index] = {
                ...AppState.flashcards[index],
                question,
                answer,
                category,
                updatedAt: new Date().toISOString()
            };
            showToast('Flashcard updated successfully!', 'success');
        }
    } else {
        // Create new flashcard
        const flashcard = {
            id: generateId(),
            question,
            answer,
            category,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        AppState.flashcards.push(flashcard);
        showToast('Flashcard created successfully!', 'success');
    }

    saveData('flashcards');
    renderFlashcards();
    closeModal('flashcardModal');
}

function renderFlashcards(filteredCards = null) {
    const grid = document.getElementById('flashcardsGrid');
    const cards = filteredCards || AppState.flashcards;

    if (cards.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clone"></i>
                <p>No flashcards yet. Create your first one!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = cards.map(card => `
        <div class="flashcard" data-id="${card.id}">
            <div class="flashcard-front">
                <span class="flashcard-category">${card.category}</span>
                <div class="flashcard-content">
                    <p class="flashcard-question">${escapeHtml(card.question)}</p>
                </div>
                <div class="flashcard-actions">
                    <button onclick="flipCard(this)" title="Flip">
                        <i class="fas fa-sync-alt"></i> Flip
                    </button>
                    <button onclick="editFlashcard('${card.id}')" title="Edit">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteFlashcard('${card.id}')" title="Delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            <div class="flashcard-back">
                <span class="flashcard-category">${card.category}</span>
                <div class="flashcard-content">
                    <p class="flashcard-answer">${escapeHtml(card.answer)}</p>
                </div>
                <div class="flashcard-actions">
                    <button onclick="flipCard(this)" title="Flip Back">
                        <i class="fas fa-sync-alt"></i> Flip Back
                    </button>
                    <button onclick="editFlashcard('${card.id}')" title="Edit">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteFlashcard('${card.id}')" title="Delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function flipCard(button) {
    const flashcard = button.closest('.flashcard');
    flashcard.classList.toggle('flipped');
}

function editFlashcard(id) {
    const flashcard = AppState.flashcards.find(f => f.id === id);
    if (flashcard) {
        openFlashcardModal(flashcard);
    }
}

function deleteFlashcard(id) {
    if (confirm('Are you sure you want to delete this flashcard?')) {
        AppState.flashcards = AppState.flashcards.filter(f => f.id !== id);
        saveData('flashcards');
        renderFlashcards();
        showToast('Flashcard deleted', 'success');
    }
}

function filterFlashcards() {
    const filter = document.getElementById('categoryFilter').value;

    if (filter === 'all') {
        renderFlashcards();
    } else {
        const filtered = AppState.flashcards.filter(f => f.category === filter);
        renderFlashcards(filtered);
    }
}

// ==================== Study Mode ====================
function openStudyMode() {
    if (AppState.flashcards.length === 0) {
        showToast('Create some flashcards first!', 'error');
        return;
    }

    AppState.currentStudyCards = [...AppState.flashcards];
    AppState.currentStudyIndex = 0;

    const modal = document.getElementById('studyModal');
    modal.classList.add('active');

    renderStudyCard();
}

function renderStudyCard() {
    const container = document.getElementById('studyCardContainer');
    const progress = document.getElementById('studyProgress');
    const card = AppState.currentStudyCards[AppState.currentStudyIndex];

    if (!card) return;

    let isFlipped = false;

    container.innerHTML = `
        <div class="study-card" onclick="this.querySelector('.study-card-side').textContent === 'QUESTION' ? (this.querySelector('.study-card-side').textContent = 'ANSWER', this.querySelector('.study-card-text').textContent = '${escapeHtml(card.answer)}') : (this.querySelector('.study-card-side').textContent = 'QUESTION', this.querySelector('.study-card-text').textContent = '${escapeHtml(card.question)}')">
            <div class="study-card-side">QUESTION</div>
            <div class="study-card-text">${escapeHtml(card.question)}</div>
            <p style="margin-top: 2rem; font-size: 0.875rem; color: var(--text-muted);">
                <i class="fas fa-hand-pointer"></i> Click to flip
            </p>
        </div>
    `;

    progress.textContent = `${AppState.currentStudyIndex + 1} / ${AppState.currentStudyCards.length}`;
}

function previousStudyCard() {
    if (AppState.currentStudyIndex > 0) {
        AppState.currentStudyIndex--;
        renderStudyCard();
    }
}

function nextStudyCard() {
    if (AppState.currentStudyIndex < AppState.currentStudyCards.length - 1) {
        AppState.currentStudyIndex++;
        renderStudyCard();
    } else {
        showToast('You\'ve completed all flashcards! 🎉', 'success');
        closeModal('studyModal');
    }
}

// ==================== YouTube Videos ====================
async function searchVideos() {
    const query = document.getElementById('videoSearchInput').value.trim();

    if (!query) {
        showToast('Please enter a search term', 'error');
        return;
    }

    if (!AppState.apiKeys.youtube) {
        showToast('Please configure YouTube API key first', 'error');
        openAPIConfig('youtube');
        return;
    }

    showToast('Searching videos...', 'success');

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' tutorial education')}&maxResults=12&type=video&key=${AppState.apiKeys.youtube}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch videos');
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            renderVideos(data.items);
        } else {
            showToast('No videos found', 'error');
        }
    } catch (error) {
        console.error('YouTube API Error:', error);
        showToast('Error fetching videos. Check your API key.', 'error');
    }
}

function renderVideos(videos) {
    const grid = document.getElementById('videosGrid');

    grid.innerHTML = videos.map(video => {
        const videoId = video.id.videoId;
        const thumbnail = video.snippet.thumbnails.medium.url;
        const title = video.snippet.title;
        const channel = video.snippet.channelTitle;

        return `
            <div class="video-card" onclick="openVideo('${videoId}')">
                <img src="${thumbnail}" alt="${escapeHtml(title)}" class="video-thumbnail">
                <div class="video-info">
                    <h4 class="video-title">${escapeHtml(title)}</h4>
                    <p class="video-channel">${escapeHtml(channel)}</p>
                    <div class="video-stats">
                        <span><i class="fas fa-play"></i> Watch</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openVideo(videoId) {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
}

// ==================== AI Assistant ====================
async function sendAIMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    if (!AppState.apiKeys.deepseek) {
        showToast('Please configure DeepSeek API key first', 'error');
        openAPIConfig('deepseek');
        return;
    }

    // Add user message to chat
    addChatMessage(message, 'user');
    input.value = '';

    // Auto-resize textarea
    input.style.height = 'auto';

    // Show typing indicator
    const typingId = addChatMessage('Thinking...', 'ai', true);

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AppState.apiKeys.deepseek}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful AI study assistant for college students. Help them understand complex topics, provide study tips, and explain concepts clearly. Keep responses concise but informative.'
                    },
                    ...AppState.chatHistory.slice(-10).map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;

        // Remove typing indicator
        removeTypingIndicator(typingId);

        // Add AI response
        addChatMessage(aiResponse, 'ai');

    } catch (error) {
        console.error('DeepSeek API Error:', error);
        removeTypingIndicator(typingId);
        addChatMessage('Sorry, I encountered an error. Please check your API key or try again.', 'ai');
        showToast('Error communicating with AI', 'error');
    }
}

function addChatMessage(content, sender, isTyping = false) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageId = generateId();

    const messageClass = sender === 'user' ? 'user-message' : 'ai-message';
    const icon = sender === 'user' ? 'fa-user' : 'fa-robot';

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${messageClass}`;
    messageDiv.id = messageId;

    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas ${icon}"></i>
        </div>
        <div class="message-content">
            <p>${isTyping ? '<em>' + escapeHtml(content) + '</em>' : formatMessage(content)}</p>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Save to history (unless it's typing indicator)
    if (!isTyping) {
        AppState.chatHistory.push({
            id: messageId,
            role: sender === 'user' ? 'user' : 'assistant',
            content: content,
            timestamp: new Date().toISOString()
        });
        saveData('chat');
    }

    return messageId;
}

function removeTypingIndicator(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
        message.remove();
    }
}

function renderChatHistory() {
    const messagesContainer = document.getElementById('chatMessages');
    // Keep the welcome message and add history
    AppState.chatHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${msg.role === 'user' ? 'user-message' : 'ai-message'}`;
            messageDiv.id = msg.id;

            const icon = msg.role === 'user' ? 'fa-user' : 'fa-robot';

            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="message-content">
                    <p>${formatMessage(msg.content)}</p>
                </div>
            `;

            messagesContainer.appendChild(messageDiv);
        }
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatMessage(message) {
    // Basic formatting for code blocks and line breaks
    return escapeHtml(message)
        .replace(/\n/g, '<br>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
}

async function generateFlashcardsFromAI() {
    if (!AppState.apiKeys.deepseek) {
        showToast('Please configure DeepSeek API key first', 'error');
        openAPIConfig('deepseek');
        return;
    }

    const topic = prompt('Enter a topic to generate flashcards about:');
    if (!topic) return;

    showToast('Generating flashcards...', 'success');

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AppState.apiKeys.deepseek}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful study assistant. Generate 5 flashcard questions and answers about the given topic. Format each as QUESTION: ... ANSWER: ... separated by blank lines.'
                    },
                    {
                        role: 'user',
                        content: `Generate 5 educational flashcards about: ${topic}`
                    }
                ],
                temperature: 0.8,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // Parse the flashcards (simple parsing)
        const flashcardMatches = content.match(/QUESTION:\s*(.*?)\s*ANSWER:\s*(.*?)(?=QUESTION:|$)/gs);

        if (flashcardMatches && flashcardMatches.length > 0) {
            flashcardMatches.forEach(match => {
                const questionMatch = match.match(/QUESTION:\s*(.*?)\s*ANSWER:/s);
                const answerMatch = match.match(/ANSWER:\s*(.*?)$/s);

                if (questionMatch && answerMatch) {
                    const question = questionMatch[1].trim();
                    const answer = answerMatch[1].trim();

                    const flashcard = {
                        id: generateId(),
                        question,
                        answer,
                        category: 'Other',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    AppState.flashcards.push(flashcard);
                }
            });

            saveData('flashcards');
            renderFlashcards();
            showToast(`Generated ${flashcardMatches.length} flashcards!`, 'success');
            scrollToSection('flashcards');
        } else {
            showToast('Could not parse flashcards. Try manual creation.', 'error');
        }

    } catch (error) {
        console.error('AI Flashcard Generation Error:', error);
        showToast('Error generating flashcards', 'error');
    }
}

// ==================== Community ====================
function openPostModal() {
    const modal = document.getElementById('postModal');
    document.getElementById('postTitle').value = '';
    document.getElementById('postContent').value = '';
    document.getElementById('postCategory').value = 'Computer Science';
    modal.classList.add('active');
}

function savePost() {
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const category = document.getElementById('postCategory').value;

    if (!title || !content) {
        showToast('Please fill in title and content', 'error');
        return;
    }

    const post = {
        id: generateId(),
        title,
        content,
        category,
        author: 'Student',
        likes: 0,
        comments: [],
        createdAt: new Date().toISOString()
    };

    AppState.posts.unshift(post);
    saveData('posts');
    renderPosts();
    closeModal('postModal');
    showToast('Post created successfully!', 'success');
}

function renderPosts(filteredPosts = null) {
    const container = document.getElementById('communityPosts');
    const posts = filteredPosts || AppState.posts;

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <p>No posts yet. Be the first to start a discussion!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => `
        <div class="post-card" data-id="${post.id}">
            <div class="post-header">
                <div class="post-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="post-meta">
                    <div class="post-author">${escapeHtml(post.author)}</div>
                    <div class="post-time">${formatTimeAgo(post.createdAt)}</div>
                </div>
                <span class="post-category">${post.category}</span>
            </div>
            <h3 class="post-title">${escapeHtml(post.title)}</h3>
            <p class="post-content">${escapeHtml(post.content)}</p>
            <div class="post-actions">
                <button class="post-action ${post.liked ? 'active' : ''}" onclick="likePost('${post.id}')">
                    <i class="fas fa-heart"></i> ${post.likes} Likes
                </button>
                <button class="post-action" onclick="showToast('Comments feature coming soon!', 'success')">
                    <i class="fas fa-comment"></i> ${post.comments.length} Comments
                </button>
                <button class="post-action" onclick="deletePost('${post.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

function likePost(id) {
    const post = AppState.posts.find(p => p.id === id);
    if (post) {
        if (post.liked) {
            post.likes--;
            post.liked = false;
        } else {
            post.likes++;
            post.liked = true;
        }
        saveData('posts');
        renderPosts();
    }
}

function deletePost(id) {
    if (confirm('Are you sure you want to delete this post?')) {
        AppState.posts = AppState.posts.filter(p => p.id !== id);
        saveData('posts');
        renderPosts();
        showToast('Post deleted', 'success');
    }
}

function filterPosts() {
    const filter = document.getElementById('communityFilter').value;

    if (filter === 'all') {
        renderPosts();
    } else {
        const filtered = AppState.posts.filter(p => p.category === filter);
        renderPosts(filtered);
    }
}

function sortPosts() {
    const sortBy = document.getElementById('communitySort').value;
    let sorted = [...AppState.posts];

    switch (sortBy) {
        case 'recent':
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'popular':
            sorted.sort((a, b) => b.likes - a.likes);
            break;
        case 'trending':
            // Simple trending: combination of likes and recency
            sorted.sort((a, b) => {
                const scoreA = a.likes + (Date.now() - new Date(a.createdAt).getTime()) / 1000000;
                const scoreB = b.likes + (Date.now() - new Date(b.createdAt).getTime()) / 1000000;
                return scoreB - scoreA;
            });
            break;
    }

    renderPosts(sorted);
}

// ==================== API Configuration ====================
function openAPIConfig(apiType) {
    const modal = document.getElementById('apiConfigModal');
    const content = document.getElementById('apiConfigContent');

    const configs = {
        youtube: {
            title: 'YouTube Data API v3',
            description: 'Get your free API key from Google Cloud Console',
            link: 'https://console.cloud.google.com/apis/credentials',
            placeholder: 'Enter your YouTube API key...'
        },
        deepseek: {
            title: 'DeepSeek AI API',
            description: 'Get your API key from DeepSeek platform',
            link: 'https://platform.deepseek.com/api_keys',
            placeholder: 'Enter your DeepSeek API key...'
        }
    };

    const config = configs[apiType];
    const currentKey = AppState.apiKeys[apiType] || '';

    content.innerHTML = `
        <h4 style="margin-bottom: 1rem;">${config.title}</h4>
        <p style="color: var(--text-secondary); margin-bottom: 1rem;">${config.description}</p>
        <a href="${config.link}" target="_blank" class="btn btn-secondary btn-sm" style="margin-bottom: 1.5rem;">
            <i class="fas fa-external-link-alt"></i> Get API Key
        </a>
        <div class="form-group">
            <label for="apiKeyInput">API Key</label>
            <input 
                type="password" 
                id="apiKeyInput" 
                class="form-input" 
                placeholder="${config.placeholder}"
                value="${currentKey}"
            >
        </div>
        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button class="btn btn-secondary" onclick="closeModal('apiConfigModal')">Cancel</button>
            <button class="btn btn-primary" onclick="saveAPIKey('${apiType}')">
                <i class="fas fa-save"></i> Save
            </button>
        </div>
    `;

    modal.classList.add('active');
}

function saveAPIKey(apiType) {
    const input = document.getElementById('apiKeyInput');
    const key = input.value.trim();

    if (!key) {
        showToast('Please enter an API key', 'error');
        return;
    }

    AppState.apiKeys[apiType] = key;
    saveData('apikeys');
    closeModal('apiConfigModal');
    showToast('API key saved successfully!', 'success');
}

// ==================== Modal Management ====================
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
}

// ==================== Utilities ====================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    return past.toLocaleDateString();
}

function updateStats() {
    const totalFlashcards = document.getElementById('totalFlashcards');
    const totalPosts = document.getElementById('totalPosts');

    if (totalFlashcards) {
        totalFlashcards.textContent = AppState.flashcards.length;
    }

    if (totalPosts) {
        totalPosts.textContent = AppState.posts.length;
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Auto-resize chat input
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    }
});

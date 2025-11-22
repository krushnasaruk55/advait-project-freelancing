// ==================== Common Utilities for All Pages ====================

// ==================== Application State (Shared across pages) ====================
const AppState = {
    get flashcards() {
        const stored = localStorage.getItem('studyhub_flashcards');
        return stored ? JSON.parse(stored) : [];
    },
    set flashcards(value) {
        localStorage.setItem('studyhub_flashcards', JSON.stringify(value));
    },

    get posts() {
        const stored = localStorage.getItem('studyhub_posts');
        return stored ? JSON.parse(stored) : [];
    },
    set posts(value) {
        localStorage.setItem('studyhub_posts', JSON.stringify(value));
    },

    get apiKeys() {
        const stored = localStorage.getItem('studyhub_apikeys');
        return stored ? JSON.parse(stored) : { youtube: '', deepseek: '' };
    },
    set apiKeys(value) {
        localStorage.setItem('studyhub_apikeys', JSON.stringify(value));
    },

    get chatHistory() {
        const stored = localStorage.getItem('studyhub_chat');
        return stored ? JSON.parse(stored) : [];
    },
    set chatHistory(value) {
        localStorage.setItem('studyhub_chat', JSON.stringify(value));
    }
};

// ==================== Navigation Management ====================
function initNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });

    // Mobile menu toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
}

// ==================== Toast Notifications ====================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
        // Create toast if it doesn't exist
        const toastEl = document.createElement('div');
        toastEl.id = 'toast';
        toastEl.className = 'toast';
        document.body.appendChild(toastEl);
    }

    const toastElement = document.getElementById('toast');
    toastElement.textContent = message;
    toastElement.className = `toast ${type} show`;

    setTimeout(() => {
        toastElement.classList.remove('show');
    }, 3000);
}

// ==================== Modal Management ====================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal on outside click
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
});

// ==================== API Configuration ====================
function openAPIConfig(apiType) {
    const modal = document.getElementById('apiConfigModal');
    const content = document.getElementById('apiConfigContent');

    if (!modal || !content) return;

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
    const currentKeys = AppState.apiKeys;
    const currentKey = currentKeys[apiType] || '';

    content.innerHTML = `
        <h4 style="margin-bottom: 1rem; color: var(--text-primary);">${config.title}</h4>
        <p style="color: var(--text-secondary); margin-bottom: 1rem;">${config.description}</p>
        <a href="${config.link}" target="_blank" class="btn btn-secondary btn-sm" style="margin-bottom: 1.5rem; display: inline-flex;">
            <i class="fas fa-external-link-alt"></i> Get API Key
        </a>
        <div class="form-group">
            <label for="apiKeyInput">API Key</label>
            <input 
                type="password" 
                id="apiKeyInput" 
                class="form-input" 
                placeholder="${config.placeholder}"
                value="${escapeHtml(currentKey)}"
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

    const keys = AppState.apiKeys;
    keys[apiType] = key;
    AppState.apiKeys = keys;

    closeModal('apiConfigModal');
    showToast('API key saved successfully!', 'success');
}

// ==================== AI Functions ====================
async function callDeepSeekAPI(messages, temperature = 0.7, maxTokens = 1000) {
    const keys = AppState.apiKeys;

    if (!keys.deepseek) {
        showToast('Please configure DeepSeek API key first', 'error');
        openAPIConfig('deepseek');
        throw new Error('No API key');
    }

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${keys.deepseek}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('DeepSeek API Error:', error);
        showToast('Error communicating with AI. Check your API key.', 'error');
        throw error;
    }
}

async function generateFlashcardsAI(topic) {
    showToast('AI is generating flashcards...', 'success');

    try {
        const content = await callDeepSeekAPI([
            {
                role: 'system',
                content: 'You are a helpful study assistant. Generate 8 educational flashcard questions and answers about the given topic. Format EXACTLY as: QUESTION: [question text]\nANSWER: [answer text]\n\n (with double line break between each card)'
            },
            {
                role: 'user',
                content: `Generate 8 comprehensive flashcards about: ${topic}`
            }
        ], 0.8, 1500);

        // Parse flashcards
        const flashcardMatches = content.match(/QUESTION:\s*(.*?)\s*ANSWER:\s*(.*?)(?=QUESTION:|$)/gs);

        if (!flashcardMatches || flashcardMatches.length === 0) {
            throw new Error('Could not parse flashcards');
        }

        const newFlashcards = [];
        flashcardMatches.forEach(match => {
            const questionMatch = match.match(/QUESTION:\s*(.*?)\s*ANSWER:/s);
            const answerMatch = match.match(/ANSWER:\s*(.*?)$/s);

            if (questionMatch && answerMatch) {
                const question = questionMatch[1].trim();
                const answer = answerMatch[1].trim();

                if (question && answer) {
                    newFlashcards.push({
                        id: generateId(),
                        question,
                        answer,
                        category: categorizeFromTopic(topic),
                        topic: topic,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                }
            }
        });

        if (newFlashcards.length > 0) {
            const allFlashcards = AppState.flashcards;
            AppState.flashcards = [...newFlashcards, ...allFlashcards];
            showToast(`Generated ${newFlashcards.length} flashcards!`, 'success');
            return newFlashcards;
        } else {
            throw new Error('No flashcards generated');
        }

    } catch (error) {
        console.error('Flashcard generation error:', error);
        showToast('Failed to generate flashcards. Try again.', 'error');
        return [];
    }
}

async function searchYouTubeVideos(topic) {
    const keys = AppState.apiKeys;

    if (!keys.youtube) {
        showToast('Please configure YouTube API key first', 'error');
        openAPIConfig('youtube');
        throw new Error('No API key');
    }

    showToast('Searching for videos...', 'success');

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topic + ' tutorial education')}&maxResults=12&type=video&videoDuration=medium&key=${keys.youtube}`
        );

        if (!response.ok) {
            throw new Error('YouTube API request failed');
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            showToast('No videos found for this topic', 'error');
            return [];
        }

        return data.items;
    } catch (error) {
        console.error('YouTube API Error:', error);
        showToast('Error fetching videos. Check your API key.', 'error');
        return [];
    }
}

// ==================== Utility Functions ====================
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

function categorizeFromTopic(topic) {
    const topicLower = topic.toLowerCase();

    if (topicLower.includes('programming') || topicLower.includes('code') ||
        topicLower.includes('javascript') || topicLower.includes('python') ||
        topicLower.includes('react') || topicLower.includes('java') ||
        topicLower.includes('computer') || topicLower.includes('software')) {
        return 'Computer Science';
    } else if (topicLower.includes('math') || topicLower.includes('calculus') ||
        topicLower.includes('algebra') || topicLower.includes('geometry')) {
        return 'Mathematics';
    } else if (topicLower.includes('physics') || topicLower.includes('mechanics') ||
        topicLower.includes('quantum')) {
        return 'Physics';
    } else if (topicLower.includes('chemistry') || topicLower.includes('chemical') ||
        topicLower.includes('organic')) {
        return 'Chemistry';
    } else if (topicLower.includes('biology') || topicLower.includes('cell') ||
        topicLower.includes('genetics') || topicLower.includes('photosynthesis')) {
        return 'Biology';
    } else if (topicLower.includes('history') || topicLower.includes('war') ||
        topicLower.includes('ancient')) {
        return 'History';
    } else if (topicLower.includes('literature') || topicLower.includes('english') ||
        topicLower.includes('writing')) {
        return 'English';
    }

    return 'Other';
}

function formatMessage(message) {
    // Basic formatting for code blocks and line breaks
    return escapeHtml(message)
        .replace(/\n/g, '<br>')
        .replace(/`([^`]+)`/g, '<code style="background: var(--surface); padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-family: monospace;">$1</code>');
}

// ==================== Initialize Common Features ====================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
});

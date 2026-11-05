/**
 * University ELSE / BK-LMS Online Exam Application
 * Quản trị hệ thống (Linux / CentOS) - 50 Multiple Choice Questions
 */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  const SoundFX = {
    ctx: null,
    enabled: true,
    init() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      } catch (e) {
        console.warn('Web Audio API not supported', e);
      }
    },
    playTone(freq, type, duration, delay = 0) {
      if (!this.enabled) return;
      if (!this.ctx) this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      setTimeout(() => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

          gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start();
          osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
      }, delay * 1000);
    },
    click() {
      this.playTone(600, 'sine', 0.04);
    },
    flag() {
      this.playTone(880, 'triangle', 0.08);
    },
    correct() {
      this.playTone(523.25, 'sine', 0.1, 0); // C5
      this.playTone(659.25, 'sine', 0.15, 0.08); // E5
      this.playTone(783.99, 'sine', 0.25, 0.16); // G5
    },
    wrong() {
      this.playTone(300, 'sawtooth', 0.15, 0);
      this.playTone(220, 'sawtooth', 0.25, 0.1);
    },
    finish() {
      this.playTone(523.25, 'triangle', 0.15, 0);
      this.playTone(659.25, 'triangle', 0.15, 0.12);
      this.playTone(783.99, 'triangle', 0.15, 0.24);
      this.playTone(1046.50, 'triangle', 0.4, 0.36); // C6
    }
  };

  // --- APPLICATION STATE ---
  const State = {
    quiz: null,
    mode: 'exam', // 'exam' | 'study' | 'review'
    answers: {},
    flags: {},
    studyChecked: {},
    filter: 'all', // 'all' | 'unanswered' | 'answered' | 'flagged' | 'wrong'
    durationSeconds: 50 * 60,
    remainingSeconds: 50 * 60,
    timerInterval: null,
    startTime: null,
    endTime: null,
    student: {
      name: 'Nguyễn Văn A',
      mssv: '20261234'
    },
    isShuffled: false,
    questionOrder: [],
    storageKey: 'ELSE_QUIZ_QTHT_STATE_v1',

    save() {
      try {
        const payload = {
          mode: this.mode,
          answers: this.answers,
          flags: this.flags,
          studyChecked: this.studyChecked,
          remainingSeconds: this.remainingSeconds,
          startTime: this.startTime,
          endTime: this.endTime,
          student: this.student,
          isShuffled: this.isShuffled,
          questionOrder: this.questionOrder
        };
        localStorage.setItem(this.storageKey, JSON.stringify(payload));
      } catch (e) {
        console.warn('Could not save to localStorage', e);
      }
    },

    load() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const data = JSON.parse(raw);
          this.mode = data.mode || 'exam';
          this.answers = data.answers || {};
          this.flags = data.flags || {};
          this.studyChecked = data.studyChecked || {};
          this.remainingSeconds = typeof data.remainingSeconds === 'number' ? data.remainingSeconds : 50 * 60;
          this.startTime = data.startTime || null;
          this.endTime = data.endTime || null;
          this.student = data.student || this.student;
          this.isShuffled = !!data.isShuffled;
          this.questionOrder = Array.isArray(data.questionOrder) ? data.questionOrder : [];
          return true;
        }
      } catch (e) {
        console.warn('Could not load from localStorage', e);
      }
      return false;
    },

    clear() {
      localStorage.removeItem(this.storageKey);
      this.answers = {};
      this.flags = {};
      this.studyChecked = {};
      this.remainingSeconds = this.durationSeconds;
      this.startTime = null;
      this.endTime = null;
      this.mode = 'exam';
    }
  };

  // --- DOM SELECTORS ---
  const DOM = {
    stream: document.getElementById('question-stream'),
    navGrid: document.getElementById('nav-grid'),
    timerClock: document.getElementById('timer-clock'),
    timerBox: document.getElementById('timer-box'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    progressText: document.getElementById('progress-text'),
    unansweredCountBadge: document.getElementById('unanswered-count-badge'),
    modePill: document.getElementById('current-mode-pill'),
    btnSubmitTop: document.getElementById('btn-submit-top'),
    btnSubmitNav: document.getElementById('btn-submit-nav'),
    btnModeExam: document.getElementById('btn-mode-exam'),
    btnModeStudy: document.getElementById('btn-mode-study'),
    btnShuffle: document.getElementById('btn-shuffle'),
    btnReset: document.getElementById('btn-reset'),
    btnTheme: document.getElementById('btn-theme'),
    btnSound: document.getElementById('btn-sound'),
    btnFullscreen: document.getElementById('btn-fullscreen'),
    btnUserEdit: document.getElementById('btn-user-edit'),
    userNameDisplay: document.getElementById('user-name-display'),
    userMssvDisplay: document.getElementById('user-mssv-display'),
    userAvatarDisplay: document.getElementById('user-avatar-display'),
    mobileNavToggle: document.getElementById('mobile-nav-toggle'),
    sidebarContainer: document.getElementById('sidebar-container'),
    mobileSubmitBtn: document.getElementById('mobile-submit-btn'),
    // Modals
    modalBackdrop: document.getElementById('modal-backdrop'),
    modalContainer: document.getElementById('modal-container'),
    lightboxModal: document.getElementById('lightbox-modal'),
    lightboxImg: document.getElementById('lightbox-img'),
    filterPills: document.querySelectorAll('.filter-pill')
  };

  // --- INITIALIZATION ---
  function init() {
    if (!window.QUIZ_DATA) {
      alert('Không tìm thấy dữ liệu đề thi! Vui lòng kiểm tra file quiz-data.js');
      return;
    }

    State.quiz = window.QUIZ_DATA;
    State.durationSeconds = (State.quiz.durationMinutes || 50) * 60;
    State.remainingSeconds = State.durationSeconds;

    // Initialize question ordering
    const loaded = State.load();
    if (!loaded || !State.questionOrder.length) {
      State.questionOrder = State.quiz.questions.map(q => q.id);
      State.startTime = new Date().toISOString();
    }

    // Initialize user details display
    updateUserDisplay();

    // Start Timer if not review mode
    if (State.mode !== 'review') {
      startTimer();
    } else {
      showReviewModeUI();
    }

    // Setup Theme from LocalStorage or Preference
    const savedTheme = localStorage.getItem('ELSE_THEME') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);

    // Setup Sound toggle state
    SoundFX.enabled = localStorage.getItem('ELSE_SOUND') !== 'false';
    updateSoundButton();

    // Bind event handlers
    bindEvents();

    // Render Stream and Nav
    renderStream();
    renderNavGrid();
    updateProgress();
    updateFilterCounts();
    updateModeDisplay();

    // Setup Scroll Spy for navigation grid
    setupScrollSpy();
  }

  // --- THEME & SOUND ---
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ELSE_THEME', theme);
    if (DOM.btnTheme) {
      DOM.btnTheme.innerHTML = theme === 'dark' 
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> Giao diện Sáng'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> Giao diện Tối';
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  function updateSoundButton() {
    if (DOM.btnSound) {
      DOM.btnSound.innerHTML = SoundFX.enabled
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg> Âm thanh: Bật'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg> Âm thanh: Tắt';
    }
  }

  function toggleSound() {
    SoundFX.enabled = !SoundFX.enabled;
    localStorage.setItem('ELSE_SOUND', SoundFX.enabled ? 'true' : 'false');
    updateSoundButton();
    if (SoundFX.enabled) SoundFX.click();
  }

  function updateUserDisplay() {
    if (DOM.userNameDisplay) DOM.userNameDisplay.textContent = State.student.name;
    if (DOM.userMssvDisplay) DOM.userMssvDisplay.textContent = 'MSSV: ' + State.student.mssv;
    if (DOM.userAvatarDisplay) {
      const parts = State.student.name.trim().split(' ');
      DOM.userAvatarDisplay.textContent = parts[parts.length - 1].charAt(0).toUpperCase();
    }
  }

  // --- TIMER CONTROLLER ---
  function startTimer() {
    clearInterval(State.timerInterval);
    updateTimerDisplay();

    State.timerInterval = setInterval(() => {
      if (State.mode === 'study') {
        // In study mode, timer doesn't force end or count down negatively
        State.remainingSeconds--;
        updateTimerDisplay();
        State.save();
        return;
      }

      if (State.remainingSeconds > 0) {
        State.remainingSeconds--;
        updateTimerDisplay();
        if (State.remainingSeconds % 10 === 0) {
          State.save();
        }
      } else {
        clearInterval(State.timerInterval);
        submitQuiz(true); // Auto-submit when time is up
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    if (!DOM.timerClock) return;
    const s = Math.max(0, State.remainingSeconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const formatted = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    DOM.timerClock.textContent = formatted;

    const mobileTimer = document.getElementById('mobile-timer');
    if (mobileTimer) mobileTimer.textContent = formatted;

    if (DOM.timerBox) {
      if (State.mode === 'exam' && s <= 300) { // Under 5 minutes
        DOM.timerBox.classList.add('warning-time');
      } else {
        DOM.timerBox.classList.remove('warning-time');
      }
    }
  }

  // --- RENDERING QUESTIONS STREAM ---
  function renderStream() {
    if (!DOM.stream) return;

    // Filter questions based on current tab
    const filteredIds = State.questionOrder.filter(id => {
      const isAnswered = State.answers[id] !== undefined;
      const isFlagged = !!State.flags[id];
      const q = State.quiz.questions.find(item => item.id === id);

      if (State.filter === 'all') return true;
      if (State.filter === 'unanswered') return !isAnswered;
      if (State.filter === 'answered') return isAnswered;
      if (State.filter === 'flagged') return isFlagged;
      if (State.filter === 'wrong') {
        if (!q) return false;
        return isAnswered && State.answers[id] !== q.answer;
      }
      return true;
    });

    if (filteredIds.length === 0) {
      DOM.stream.innerHTML = `
        <div style="background:var(--card-bg); padding:3rem 2rem; text-align:center; border:1px dashed var(--card-border); border-radius:12px;">
          <div style="font-size:2.5rem; margin-bottom:0.75rem;">📋</div>
          <h3 style="color:var(--text-main); margin-bottom:0.5rem;">Không có câu hỏi nào trong mục này</h3>
          <p style="color:var(--text-muted); font-size:0.88rem;">Hãy chọn bộ lọc "Tất cả" hoặc thay đổi trạng thái làm bài.</p>
          <button class="btn btn-outline" style="margin-top:1rem;" onclick="window.APP.setFilter('all')">Xem tất cả 50 câu</button>
        </div>
      `;
      return;
    }

    let html = '';
    filteredIds.forEach(qId => {
      const q = State.quiz.questions.find(item => item.id === qId);
      if (!q) return;

      const isAnswered = State.answers[qId] !== undefined;
      const selectedKey = State.answers[qId];
      const isFlagged = !!State.flags[qId];
      const isChecked = !!State.studyChecked[qId];
      const isReview = State.mode === 'review';

      // Status badge calculation
      let statusBadgeHtml = '<div class="q-status-badge">Chưa trả lời</div>';
      if (isReview) {
        if (!isAnswered) {
          statusBadgeHtml = '<div class="q-status-badge incorrect">Chưa làm</div>';
        } else if (selectedKey === q.answer) {
          statusBadgeHtml = '<div class="q-status-badge correct">Chính xác</div>';
        } else {
          statusBadgeHtml = '<div class="q-status-badge incorrect">Không chính xác</div>';
        }
      } else if (isAnswered) {
        statusBadgeHtml = '<div class="q-status-badge answered">Đã trả lời</div>';
      }

      // Image HTML
      let imageHtml = '';
      const imgSrc = q.imageBase64 || q.image;
      if (imgSrc) {
        imageHtml = `
          <div class="q-image-container" onclick="window.APP.openLightbox('${imgSrc}')">
            <img src="${imgSrc}" alt="Đoạn mã / Hình ảnh đính kèm câu ${q.id}" loading="lazy" />
            <span class="zoom-hint">🔍 Nhấn để phóng to</span>
          </div>
        `;
      }

      // Choices HTML
      let choicesHtml = '';
      q.choices.forEach(c => {
        const isSelected = selectedKey === c.key;
        let choiceClass = 'q-choice-item';
        let badgeIcon = '';

        if (isSelected) choiceClass += ' selected';

        if (isReview || (State.mode === 'study' && isChecked)) {
          if (c.key === q.answer) {
            choiceClass += ' correct-choice';
            badgeIcon = '<span class="choice-badge-icon" title="Đáp án chính xác">✓</span>';
          } else if (isSelected && c.key !== q.answer) {
            choiceClass += ' wrong-choice';
            badgeIcon = '<span class="choice-badge-icon" title="Lựa chọn chưa đúng">✗</span>';
          }
        }

        const disabledAttr = isReview ? 'disabled' : '';

        choicesHtml += `
          <label class="${choiceClass}" for="q_${q.id}_${c.key}">
            <input type="radio" 
                   class="q-choice-radio" 
                   id="q_${q.id}_${c.key}" 
                   name="question_${q.id}" 
                   value="${c.key}" 
                   ${isSelected ? 'checked' : ''} 
                   ${disabledAttr}
                   onchange="window.APP.selectAnswer(${q.id}, '${c.key}')" />
            <span class="q-choice-key">${c.key}.</span>
            <span class="q-choice-text">${formatCodeSnippets(c.text)}</span>
            ${badgeIcon}
          </label>
        `;
      });

      // Explanation / Feedback box HTML
      let feedbackHtml = '';
      if ((isReview && isAnswered) || isReview || (State.mode === 'study' && isChecked)) {
        const isCorrect = selectedKey === q.answer;
        const alertTitle = isCorrect ? 'Câu trả lời của bạn là CHÍNH XÁC!' : (isAnswered ? 'Câu trả lời của bạn CHƯA ĐÚNG.' : 'Bạn chưa đưa ra câu trả lời cho câu hỏi này.');
        const alertColor = isCorrect ? '#16a34a' : '#dc2626';

        feedbackHtml = `
          <div class="q-explanation-box">
            <div class="q-explanation-header" style="color: ${alertColor};">
              <span>${isCorrect ? '🎯' : '💡'}</span>
              <span>${alertTitle}</span>
            </div>
            <div style="font-size:0.83rem; font-weight:600; margin-bottom:0.4rem; color:var(--text-main);">
              Đáp án đúng: <span style="color:#0284c7;">${q.answer_text || q.answer}</span>
            </div>
            <div class="q-explanation-content">
              <strong>Giải thích chi tiết:</strong> ${formatCodeSnippets(q.explanation || 'Không có giải thích bổ sung.')}
            </div>
          </div>
        `;
      }

      // Actions row (Clear choice, Check answer in study mode)
      let actionsHtml = '';
      if (!isReview) {
        let studyCheckBtn = '';
        if (State.mode === 'study') {
          studyCheckBtn = `
            <button class="btn btn-sm btn-primary" onclick="window.APP.checkStudyAnswer(${q.id})">
              Kiểm tra đáp án
            </button>
          `;
        }

        actionsHtml = `
          <div class="q-actions-row">
            <button class="q-clear-btn" onclick="window.APP.clearAnswer(${q.id})">Xoá lựa chọn của tôi</button>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              ${studyCheckBtn}
            </div>
          </div>
        `;
      }

      html += `
        <div class="question-card" id="card-q-${q.id}" data-qid="${q.id}">
          <div class="q-info-box">
            <div class="q-number-title">
              <span>Câu hỏi</span>
              <span style="font-size:1.15rem; color:var(--primary);">${q.id}</span>
            </div>
            ${statusBadgeHtml}
            <div class="q-points-info">Đạt điểm 0,20 / 1,00</div>
            <button class="q-flag-btn ${isFlagged ? 'flagged' : ''}" onclick="window.APP.toggleFlag(${q.id})">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="${isFlagged ? '#ef4444' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                <line x1="4" y1="22" x2="4" y2="15"></line>
              </svg>
              <span>${isFlagged ? 'Bỏ cờ' : 'Đặt cờ'}</span>
            </button>
            <div class="q-category-tag">📂 ${q.topic}</div>
          </div>

          <div class="q-content-box">
            <div class="q-prompt-text">${formatCodeSnippets(q.prompt)}</div>
            ${imageHtml}
            <div class="q-select-label">Chọn một:</div>
            <div class="q-choices-list">
              ${choicesHtml}
            </div>
            ${feedbackHtml}
            ${actionsHtml}
          </div>
        </div>
      `;
    });

    DOM.stream.innerHTML = html;
  }

  // Format code spans like /etc/fstab, iptables, etc.
  function formatCodeSnippets(text) {
    if (!text) return '';
    // Replace markdown backticks `code` with <code>code</code>
    let formatted = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    return formatted;
  }

  // --- RENDERING NAVIGATION GRID (50 BUTTONS) ---
  function renderNavGrid() {
    if (!DOM.navGrid) return;

    let html = '';
    State.questionOrder.forEach(id => {
      const isAnswered = State.answers[id] !== undefined;
      const isFlagged = !!State.flags[id];
      const q = State.quiz.questions.find(item => item.id === id);

      let btnClasses = ['moodle-nav-btn'];
      if (isAnswered) btnClasses.push('answered');
      if (isFlagged) btnClasses.push('flagged');

      if (State.mode === 'review' && q) {
        if (isAnswered && State.answers[id] === q.answer) {
          btnClasses.push('correct');
        } else if (isAnswered) {
          btnClasses.push('incorrect');
        }
      }

      html += `
        <a href="#card-q-${id}" 
           class="${btnClasses.join(' ')}" 
           id="nav-btn-${id}" 
           onclick="window.APP.scrollToQuestion(${id}, event)"
           title="Câu hỏi ${id}${isFlagged ? ' (Đã gắn cờ)' : ''}${isAnswered ? ' (Đã làm)' : ''}">
          <div class="btn-num">${id}</div>
          <div class="btn-bottom"></div>
        </a>
      `;
    });

    DOM.navGrid.innerHTML = html;
  }

  // --- ACTIONS ---
  function selectAnswer(qId, key) {
    if (State.mode === 'review') return;
    State.answers[qId] = key;
    SoundFX.click();

    State.save();
    updateProgress();
    updateFilterCounts();
    updateSingleCard(qId);
    updateSingleNavBtn(qId);
  }

  function clearAnswer(qId) {
    if (State.mode === 'review') return;
    delete State.answers[qId];
    delete State.studyChecked[qId];
    SoundFX.click();

    State.save();
    updateProgress();
    updateFilterCounts();
    updateSingleCard(qId);
    updateSingleNavBtn(qId);
  }

  function toggleFlag(qId) {
    State.flags[qId] = !State.flags[qId];
    if (State.flags[qId]) SoundFX.flag();
    else SoundFX.click();

    State.save();
    updateFilterCounts();
    updateSingleCard(qId);
    updateSingleNavBtn(qId);
  }

  function checkStudyAnswer(qId) {
    State.studyChecked[qId] = true;
    const q = State.quiz.questions.find(item => item.id === qId);
    if (q && State.answers[qId] === q.answer) {
      SoundFX.correct();
    } else {
      SoundFX.wrong();
    }
    State.save();
    updateSingleCard(qId);
  }

  function updateSingleCard(qId) {
    const card = document.getElementById(`card-q-${qId}`);
    if (!card) return;

    const q = State.quiz.questions.find(item => item.id === qId);
    if (!q) return;

    const isAnswered = State.answers[qId] !== undefined;
    const selectedKey = State.answers[qId];
    const isFlagged = !!State.flags[qId];
    const isChecked = !!State.studyChecked[qId];

    // Update status badge
    const badge = card.querySelector('.q-status-badge');
    if (badge) {
      if (isAnswered) {
        badge.className = 'q-status-badge answered';
        badge.textContent = 'Đã trả lời';
      } else {
        badge.className = 'q-status-badge';
        badge.textContent = 'Chưa trả lời';
      }
    }

    // Update flag button
    const flagBtn = card.querySelector('.q-flag-btn');
    if (flagBtn) {
      if (isFlagged) {
        flagBtn.classList.add('flagged');
        flagBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" stroke="currentColor" stroke-width="2">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
            <line x1="4" y1="22" x2="4" y2="15"></line>
          </svg>
          <span>Bỏ cờ</span>
        `;
      } else {
        flagBtn.classList.remove('flagged');
        flagBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
            <line x1="4" y1="22" x2="4" y2="15"></line>
          </svg>
          <span>Đặt cờ</span>
        `;
      }
    }

    // Update radio selections visually
    const choices = card.querySelectorAll('.q-choice-item');
    choices.forEach(item => {
      const radio = item.querySelector('input[type="radio"]');
      if (radio) {
        if (radio.value === selectedKey) {
          item.classList.add('selected');
          radio.checked = true;
        } else {
          item.classList.remove('selected');
          radio.checked = false;
        }
      }
    });

    // In study mode with checked state, re-render to inject explanation cleanly
    if (State.mode === 'study' && isChecked) {
      renderStream();
    }
  }

  function updateSingleNavBtn(qId) {
    const btn = document.getElementById(`nav-btn-${qId}`);
    if (!btn) return;

    const isAnswered = State.answers[qId] !== undefined;
    const isFlagged = !!State.flags[qId];

    if (isAnswered) btn.classList.add('answered');
    else btn.classList.remove('answered');

    if (isFlagged) btn.classList.add('flagged');
    else btn.classList.remove('flagged');
  }

  function updateProgress() {
    const total = State.quiz.totalQuestions || 50;
    const answeredCount = Object.keys(State.answers).length;
    const pct = Math.round((answeredCount / total) * 100);

    if (DOM.progressBarFill) DOM.progressBarFill.style.width = `${pct}%`;
    if (DOM.progressText) DOM.progressText.textContent = `Đã hoàn thành: ${answeredCount}/${total} câu (${pct}%)`;
    if (DOM.unansweredCountBadge) DOM.unansweredCountBadge.textContent = total - answeredCount;
  }

  function updateFilterCounts() {
    const total = State.quiz.totalQuestions || 50;
    const answeredCount = Object.keys(State.answers).length;
    const unansweredCount = total - answeredCount;
    const flaggedCount = Object.values(State.flags).filter(Boolean).length;

    let wrongCount = 0;
    if (State.mode === 'review') {
      State.quiz.questions.forEach(q => {
        if (State.answers[q.id] !== undefined && State.answers[q.id] !== q.answer) {
          wrongCount++;
        }
      });
    }

    document.querySelectorAll('[data-filter-count]').forEach(el => {
      const type = el.getAttribute('data-filter-count');
      if (type === 'all') el.textContent = total;
      if (type === 'unanswered') el.textContent = unansweredCount;
      if (type === 'answered') el.textContent = answeredCount;
      if (type === 'flagged') el.textContent = flaggedCount;
      if (type === 'wrong') el.textContent = wrongCount;
    });
  }

  function setFilter(filter) {
    State.filter = filter;
    DOM.filterPills.forEach(pill => {
      if (pill.getAttribute('data-filter') === filter) pill.classList.add('active');
      else pill.classList.remove('active');
    });
    renderStream();
  }

  function scrollToQuestion(qId, event) {
    if (event) event.preventDefault();

    // If currently filtered out, switch to 'all' so card exists
    if (State.filter !== 'all') {
      setFilter('all');
    }

    // Mobile drawer close if open
    if (DOM.sidebarContainer && DOM.sidebarContainer.classList.contains('mobile-open')) {
      DOM.sidebarContainer.classList.remove('mobile-open');
    }

    setTimeout(() => {
      const el = document.getElementById(`card-q-${qId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('active-focus');
        setTimeout(() => el.classList.remove('active-focus'), 1500);
      }
    }, 50);
  }

  // --- SUBMISSION FLOW & MODALS ---
  function openSubmitModal() {
    const total = State.quiz.totalQuestions || 50;
    const answeredCount = Object.keys(State.answers).length;
    const missingCount = total - answeredCount;

    let rowsHtml = '';
    State.questionOrder.forEach(id => {
      const isAnswered = State.answers[id] !== undefined;
      const isFlagged = !!State.flags[id];

      rowsHtml += `
        <tr>
          <td><strong>Câu hỏi ${id}</strong></td>
          <td>${isAnswered ? '<span class="status-saved">✓ Trả lời đã được lưu</span>' : '<span class="status-missing">⚠ Chưa trả lời</span>'}</td>
          <td>${isFlagged ? '<span style="color:var(--flag-red);">🚩 Đã đặt cờ</span>' : '<span style="color:var(--text-muted);">-</span>'}</td>
          <td style="text-align:right;">
            <button class="btn btn-sm btn-outline" onclick="window.APP.closeModal(); window.APP.scrollToQuestion(${id});">Xem lại</button>
          </td>
        </tr>
      `;
    });

    let warningNotice = '';
    if (missingCount > 0) {
      warningNotice = `
        <div style="background:var(--danger-bg); border:1px solid var(--danger-border); border-radius:8px; padding:0.85rem 1rem; color:#991b1b; font-size:0.85rem; display:flex; align-items:center; gap:0.5rem;">
          <span style="font-size:1.25rem;">⚠️</span>
          <div>
            <strong>Cảnh báo:</strong> Bạn còn <strong>${missingCount}</strong> câu hỏi chưa đưa ra câu trả lời! Các câu chưa làm sẽ bị tính 0 điểm.
          </div>
        </div>
      `;
    }

    const modalHtml = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Tóm tắt bài kiểm tra (Summary of attempt)
          </h3>
          <button class="modal-close-btn" onclick="window.APP.closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          ${warningNotice}
          <div style="max-height:360px; overflow-y:auto; border:1px solid var(--card-border); border-radius:6px;">
            <table class="summary-table">
              <thead>
                <tr>
                  <th>Câu hỏi</th>
                  <th>Trạng thái</th>
                  <th>Cờ đánh dấu</th>
                  <th style="text-align:right;">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
          <p style="font-size:0.82rem; color:var(--text-muted); font-style:italic;">
            Khi nộp bài, bạn sẽ không thể thay đổi các câu trả lời của mình cho lượt thi này nữa. Hệ thống sẽ chấm điểm và mở bảng giải thích chi tiết.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="window.APP.closeModal()">Quay lại làm tiếp</button>
          <button class="btn btn-danger" onclick="window.APP.submitQuiz(false)">Nộp tất cả và kết thúc</button>
        </div>
      </div>
    `;

    openCustomModal(modalHtml);
  }

  function submitQuiz(isAutoSubmit = false) {
    closeModal();
    clearInterval(State.timerInterval);
    State.mode = 'review';
    State.endTime = new Date().toISOString();
    SoundFX.finish();

    // Calculate score
    const total = State.quiz.totalQuestions || 50;
    let correctCount = 0;
    const categoryStats = {};

    State.quiz.questions.forEach(q => {
      const topic = q.topic || 'Chung';
      if (!categoryStats[topic]) {
        categoryStats[topic] = { total: 0, correct: 0 };
      }
      categoryStats[topic].total++;

      if (State.answers[q.id] === q.answer) {
        correctCount++;
        categoryStats[topic].correct++;
      }
    });

    const finalScore = ((correctCount / total) * 10).toFixed(2);
    const percentage = Math.round((correctCount / total) * 100);

    State.save();

    // Update UI for Review Mode
    showReviewModeUI();
    renderStream();
    renderNavGrid();
    updateFilterCounts();

    // Show Results Scorecard Modal
    openResultsModal(correctCount, total, finalScore, percentage, categoryStats, isAutoSubmit);
  }

  function openResultsModal(correctCount, total, score, percentage, catStats, isAutoSubmit) {
    let gradeText = 'Cần cố gắng thêm';
    let gradeColor = '#dc2626';
    if (score >= 9.0) { gradeText = 'Xuất sắc'; gradeColor = '#16a34a'; }
    else if (score >= 8.0) { gradeText = 'Giỏi'; gradeColor = '#0284c7'; }
    else if (score >= 6.5) { gradeText = 'Khá'; gradeColor = '#2563eb'; }
    else if (score >= 5.0) { gradeText = 'Trung bình - Đạt'; gradeColor = '#f59e0b'; }

    // Categories breakdown bars
    let catBarsHtml = '';
    for (const [catName, stat] of Object.entries(catStats)) {
      const catPct = Math.round((stat.correct / stat.total) * 100);
      catBarsHtml += `
        <div class="cat-bar-item">
          <div class="cat-bar-header">
            <span><strong>${catName}</strong></span>
            <span>${stat.correct}/${stat.total} câu (${catPct}%)</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${catPct}%; background:${catPct >= 70 ? '#16a34a' : (catPct >= 50 ? '#0284c7' : '#dc2626')};"></div>
          </div>
        </div>
      `;
    }

    const modalHtml = `
      <div class="modal-card" style="max-width:680px;">
        <div class="modal-header">
          <h3>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Kết quả bài thi trắc nghiệm (Quiz Results)
          </h3>
          <button class="modal-close-btn" onclick="window.APP.closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          ${isAutoSubmit ? '<div style="background:var(--warning-bg); color:#b45309; padding:0.5rem 0.75rem; border-radius:6px; font-size:0.82rem; margin-bottom:0.5rem;">⏱️ Đã hết thời gian làm bài, hệ thống tự động nộp bài!</div>' : ''}
          
          <div class="score-badge-circle">
            <span class="score-num">${score}</span>
            <span class="score-max">/ 10,00</span>
          </div>

          <div style="text-align:center; margin-top:0.5rem;">
            <div style="font-size:1.15rem; font-weight:700; color:${gradeColor};">${gradeText}</div>
            <div style="font-size:0.85rem; color:var(--text-muted);">
              Đúng <strong>${correctCount}</strong> trên tổng số <strong>${total}</strong> câu hỏi (${percentage}%)
            </div>
          </div>

          <div class="result-summary-grid">
            <div class="result-stat-box">
              <div class="result-stat-val" style="color:#16a34a;">${correctCount}</div>
              <div class="result-stat-lbl">Số câu đúng</div>
            </div>
            <div class="result-stat-box">
              <div class="result-stat-val" style="color:#dc2626;">${total - correctCount}</div>
              <div class="result-stat-lbl">Số câu sai / Chưa làm</div>
            </div>
          </div>

          <div style="margin-top:0.75rem;">
            <h4 style="font-size:0.88rem; color:var(--text-main); margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;">
              <span>📊</span> Đánh giá năng lực theo từng chủ đề:
            </h4>
            <div class="category-bars-list">
              ${catBarsHtml}
            </div>
          </div>
        </div>
        <div class="modal-footer" style="justify-content:space-between; flex-wrap:wrap;">
          <div>
            <button class="btn btn-outline" onclick="window.print()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              In bảng điểm / Lưu PDF
            </button>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-outline" onclick="window.APP.setFilter('wrong'); window.APP.closeModal();">Chỉ xem câu sai</button>
            <button class="btn btn-primary" onclick="window.APP.closeModal()">Xem toàn bộ giải thích</button>
          </div>
        </div>
      </div>
    `;

    openCustomModal(modalHtml);
  }

  function showReviewModeUI() {
    if (DOM.modePill) {
      DOM.modePill.className = 'mode-pill review';
      DOM.modePill.innerHTML = '<span>📊</span> Chế độ Xem lại & Giải thích';
    }
    if (DOM.btnSubmitTop) DOM.btnSubmitTop.style.display = 'none';
    if (DOM.btnSubmitNav) DOM.btnSubmitNav.style.display = 'none';
    if (DOM.mobileSubmitBtn) DOM.mobileSubmitBtn.style.display = 'none';

    // Show filter for wrong answers
    const wrongFilterPill = document.querySelector('[data-filter="wrong"]');
    if (wrongFilterPill) wrongFilterPill.style.display = 'inline-block';
  }

  function resetQuiz() {
    if (!confirm('Bạn có chắc chắn muốn làm lại bài thi từ đầu? Tất cả câu trả lời hiện tại sẽ bị xóa.')) {
      return;
    }
    State.clear();
    location.reload();
  }

  function shuffleQuestions() {
    if (!confirm('Bạn có muốn xáo trộn ngẫu nhiên thứ tự 50 câu hỏi không?')) return;

    // Fisher-Yates shuffle
    const array = [...State.questionOrder];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }

    State.questionOrder = array;
    State.isShuffled = true;
    State.save();
    renderStream();
    renderNavGrid();
    SoundFX.click();
  }

  function switchMode(newMode) {
    if (newMode === State.mode) return;
    State.mode = newMode;
    State.save();
    updateModeDisplay();
    renderStream();
    renderNavGrid();
  }

  function updateModeDisplay() {
    if (!DOM.modePill) return;
    if (State.mode === 'exam') {
      DOM.modePill.className = 'mode-pill exam';
      DOM.modePill.innerHTML = '<span>⏱️</span> Chế độ Thi tính giờ';
    } else if (State.mode === 'study') {
      DOM.modePill.className = 'mode-pill study';
      DOM.modePill.innerHTML = '<span>📖</span> Chế độ Ôn thi & Kiểm tra';
    } else if (State.mode === 'review') {
      DOM.modePill.className = 'mode-pill review';
      DOM.modePill.innerHTML = '<span>📊</span> Chế độ Xem lại & Giải thích';
    }
  }

  // --- MODAL UTILS ---
  function openCustomModal(contentHtml) {
    if (!DOM.modalContainer || !DOM.modalBackdrop) return;
    DOM.modalContainer.innerHTML = contentHtml;
    DOM.modalBackdrop.classList.add('open');
  }

  function closeModal() {
    if (!DOM.modalBackdrop) return;
    DOM.modalBackdrop.classList.remove('open');
  }

  function openLightbox(imgSrc) {
    if (!DOM.lightboxModal || !DOM.lightboxImg) return;
    DOM.lightboxImg.src = imgSrc;
    DOM.lightboxModal.classList.add('open');
  }

  function closeLightbox() {
    if (!DOM.lightboxModal) return;
    DOM.lightboxModal.classList.remove('open');
  }

  function openUserEditModal() {
    const currentName = State.student.name;
    const currentMssv = State.student.mssv;
    const name = prompt('Nhập họ và tên sinh viên:', currentName);
    if (name !== null && name.trim()) {
      const mssv = prompt('Nhập mã số sinh viên (MSSV):', currentMssv) || currentMssv;
      State.student.name = name.trim();
      State.student.mssv = mssv.trim();
      State.save();
      updateUserDisplay();
    }
  }

  // --- SCROLL SPY FOR NAVIGATION HIGHLIGHT ---
  function setupScrollSpy() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const qId = entry.target.getAttribute('data-qid');
          document.querySelectorAll('.moodle-nav-btn.current').forEach(btn => btn.classList.remove('current'));
          const currentBtn = document.getElementById(`nav-btn-${qId}`);
          if (currentBtn) currentBtn.classList.add('current');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    document.querySelectorAll('.question-card').forEach(card => observer.observe(card));
  }

  // --- EVENT BINDINGS ---
  function bindEvents() {
    // Mode switcher buttons
    if (DOM.btnModeExam) DOM.btnModeExam.addEventListener('click', () => switchMode('exam'));
    if (DOM.btnModeStudy) DOM.btnModeStudy.addEventListener('click', () => switchMode('study'));
    if (DOM.btnShuffle) DOM.btnShuffle.addEventListener('click', shuffleQuestions);
    if (DOM.btnReset) DOM.btnReset.addEventListener('click', resetQuiz);

    // Header buttons
    if (DOM.btnTheme) DOM.btnTheme.addEventListener('click', toggleTheme);
    if (DOM.btnSound) DOM.btnSound.addEventListener('click', toggleSound);
    if (DOM.btnUserEdit) DOM.btnUserEdit.addEventListener('click', openUserEditModal);
    if (DOM.btnFullscreen) {
      DOM.btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Submit buttons
    if (DOM.btnSubmitTop) DOM.btnSubmitTop.addEventListener('click', openSubmitModal);
    if (DOM.btnSubmitNav) DOM.btnSubmitNav.addEventListener('click', openSubmitModal);
    if (DOM.mobileSubmitBtn) DOM.mobileSubmitBtn.addEventListener('click', openSubmitModal);

    // Mobile drawer
    if (DOM.mobileNavToggle && DOM.sidebarContainer) {
      DOM.mobileNavToggle.addEventListener('click', () => {
        DOM.sidebarContainer.classList.toggle('mobile-open');
      });
    }

    // Filter pills
    DOM.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const f = pill.getAttribute('data-filter');
        setFilter(f);
      });
    });

    // Close modals on backdrop click
    if (DOM.modalBackdrop) {
      DOM.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === DOM.modalBackdrop) closeModal();
      });
    }
    if (DOM.lightboxModal) {
      DOM.lightboxModal.addEventListener('click', (e) => {
        if (e.target !== DOM.lightboxImg) closeLightbox();
      });
    }

    // Keyboard shortcuts (Esc to close modals)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeLightbox();
      }
    });
  }

  // Expose global API for inline HTML listeners
  window.APP = {
    init,
    selectAnswer,
    clearAnswer,
    toggleFlag,
    checkStudyAnswer,
    openSubmitModal,
    submitQuiz,
    closeModal,
    resetQuiz,
    setFilter,
    scrollToQuestion,
    openLightbox,
    closeLightbox
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

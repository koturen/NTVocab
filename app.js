/**
 * app.js
 * ---------------------------------------------------------------------------
 * "Bộ não" của ứng dụng: định tuyến (router) giữa các trang, tải dữ liệu bài
 * học, và kết nối các module (Sheets, Progress, Achievements, Flashcards,
 * Quiz, Search, LessonsView) với giao diện trong index.html.
 * ---------------------------------------------------------------------------
 */

// ============================================================== Toast nhỏ
const Toast = (() => {
  function show(message, ms = 3200) {
    const stack = document.getElementById("toastStack");
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = message;
    stack.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
  return { show };
})();

// ============================================================== App state
const AppState = {
  lessonsMeta: [],          // [{name, wordCount}]
  currentLessonName: null,
  currentLessonWords: [],   // từ vựng của bài học đang mở
};

const Views = {
  dashboard: document.getElementById("view-dashboard"),
  lesson: document.getElementById("view-lesson"),
  flashcards: document.getElementById("view-flashcards"),
  quiz: document.getElementById("view-quiz"),
  quizResult: document.getElementById("view-quiz-result"),
  achievements: document.getElementById("view-achievements"),
};

function showView(name) {
  Object.values(Views).forEach(v => v.classList.remove("active"));
  Views[name].classList.add("active");
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  syncNavActiveState(name);
}

function syncNavActiveState(name) {
  const routeMap = { dashboard: "#/dashboard", achievements: "#/achievements" };
  document.querySelectorAll(".nav-item[data-route]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.route === routeMap[name]);
  });
  document.querySelectorAll(".bottom-nav-item[data-route]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.route === routeMap[name]);
  });
}

// ============================================================== Router
function encodeLesson(name) { return encodeURIComponent(name); }
function decodeLesson(str) { return decodeURIComponent(str); }

function navigateTo(hash) {
  if (location.hash === hash) { handleRoute(); } else { location.hash = hash; }
}

window.addEventListener("hashchange", handleRoute);

function handleRoute() {
  const hash = location.hash || "#/dashboard";
  const [, path, param] = hash.split("/"); // "#", "dashboard" | "lesson" | "achievements", param

  if (path === "lesson" && param) {
    openLessonDetail(decodeLesson(param));
  } else if (path === "achievements") {
    openAchievements();
  } else {
    openDashboard();
  }
}

// ============================================================== Dashboard
async function openDashboard() {
  showView("dashboard");
  renderStatGrid(); // vẽ ngay với dữ liệu hiện có (có thể là 0) để tránh giật layout

  const container = document.getElementById("lessonListContainer");
  container.innerHTML = LessonsView.loadingStateHTML("Đang tải danh sách bài học...");

  try {
    const lessons = await SheetsAPI.getLessons();
    AppState.lessonsMeta = lessons;
    renderStatGrid();
    LessonsView.renderLessonCards(container, lessons, (name) => navigateTo(`#/lesson/${encodeLesson(name)}`));
    LessonsView.renderSidebarList(document.getElementById("sidebarLessonList"), lessons, (name) => navigateTo(`#/lesson/${encodeLesson(name)}`));
  } catch (err) {
    console.error(err);
    container.innerHTML = LessonsView.errorStateHTML(err.message, "retryDashboardBtn");
    document.getElementById("retryDashboardBtn")?.addEventListener("click", openDashboard);
  }
}

const STAT_DEFS = [
  { key: "totalLessons", label: "Tổng số bài học", icon: "📘", tint: "brand" },
  { key: "totalWords", label: "Tổng số từ vựng", icon: "🗂️", tint: "coral" },
  { key: "completedLessons", label: "Bài đã hoàn thành", icon: "✅", tint: "sprout" },
  { key: "totalWordsKnown", label: "Tổng số từ đã học", icon: "🧠", tint: "brand" },
  { key: "bestQuizScore", label: "Điểm quiz cao nhất", icon: "🏅", tint: "amber", suffix: "%" },
  { key: "streak", label: "Streak học tập", icon: "🔥", tint: "coral", suffix: " ngày" },
  { key: "overallProgress", label: "Tiến độ học tập", icon: "📈", tint: "sprout", suffix: "%" },
];

function renderStatGrid() {
  const stats = Progress.getGlobalStats(AppState.lessonsMeta);
  stats.overallProgress = stats.totalWords > 0 ? Math.round((stats.totalWordsKnown / stats.totalWords) * 100) : 0;

  const grid = document.getElementById("statGrid");
  grid.innerHTML = STAT_DEFS.map(def => `
    <div class="stat-card">
      <div class="stat-icon" style="background:var(--${def.tint}-tint);">${def.icon}</div>
      <div class="stat-value">${stats[def.key] ?? 0}${def.suffix || ""}</div>
      <div class="stat-label">${def.label}</div>
    </div>`).join("");
}

// ============================================================== Lesson detail
async function openLessonDetail(lessonName) {
  showView("lesson");
  AppState.currentLessonName = lessonName;
  document.getElementById("lessonTitle").textContent = lessonName;
  document.getElementById("lessonSubtitle").textContent = "Đang tải...";
  document.getElementById("lessonSearchInput").value = "";
  const wordContainer = document.getElementById("wordListContainer");
  wordContainer.innerHTML = LessonsView.loadingStateHTML("Đang tải từ vựng...");

  try {
    const words = await SheetsAPI.getLessonWords(lessonName);
    AppState.currentLessonWords = words;
    document.getElementById("lessonSubtitle").textContent = `${words.length} từ`;
    updateLessonProgressBar();
    LessonsView.renderWordList(wordContainer, words, lessonName, (wordId) => Progress.toggleFavorite(lessonName, wordId));

    Search.attachLessonSearch(
      document.getElementById("lessonSearchInput"),
      () => AppState.currentLessonWords,
      (filtered) => LessonsView.renderWordList(wordContainer, filtered, lessonName, (wordId) => Progress.toggleFavorite(lessonName, wordId))
    );
  } catch (err) {
    console.error(err);
    wordContainer.innerHTML = LessonsView.errorStateHTML(err.message, "retryLessonBtn");
    document.getElementById("retryLessonBtn")?.addEventListener("click", () => openLessonDetail(lessonName));
  }
}

function updateLessonProgressBar() {
  const pct = Progress.getLessonWordProgressPct(AppState.currentLessonName, AppState.currentLessonWords.length);
  document.getElementById("lessonProgressFill").style.width = `${pct}%`;
}

document.getElementById("btnStartFlashcards").addEventListener("click", () => {
  if (!AppState.currentLessonWords.length) return Toast.show("Bài học chưa có từ vựng nào.");
  showView("flashcards");
  Flashcards.start(AppState.currentLessonName, AppState.currentLessonWords, "all", onProgressChanged);
});

document.getElementById("btnStartQuiz").addEventListener("click", () => {
  if (AppState.currentLessonWords.length < 2) return Toast.show("Cần ít nhất 2 từ vựng để làm quiz.");
  startQuizSession(AppState.currentLessonWords);
});

document.getElementById("btnReviewWrong").addEventListener("click", () => {
  const strugglingIds = Progress.getStrugglingWordIds(AppState.currentLessonName);
  const words = AppState.currentLessonWords.filter(w => strugglingIds.includes(w.id));
  if (!words.length) return Toast.show("Chưa có từ nào cần ôn lại — hãy học flashcards trước nhé!");
  showView("flashcards");
  Flashcards.start(AppState.currentLessonName, words, "all", onProgressChanged);
});

// ============================================================== Flashcards exit
document.getElementById("btnExitFlashcards").addEventListener("click", () => {
  Flashcards.stop();
  navigateTo(`#/lesson/${encodeLesson(AppState.currentLessonName)}`);
});

// ============================================================== Quiz
function startQuizSession(words) {
  showView("quiz");
  Quiz.start(AppState.currentLessonName, words, onQuizFinished);
}

function onQuizFinished(result) {
  Progress.recordQuizResult(result.lessonName, result.correct, result.total);
  onProgressChanged();
  renderQuizResult(result);
  showView("quizResult");
}

function renderQuizResult(result) {
  document.getElementById("resultPct").textContent = `${result.pct}%`;
  document.getElementById("resultCorrect").textContent = result.correct;
  document.getElementById("resultWrong").textContent = result.wrong;
  document.getElementById("resultTotal").textContent = result.total;

  const headline = result.pct === 100 ? "Xuất sắc — điểm tuyệt đối! 🎉"
    : result.pct >= 70 ? "Làm tốt lắm! 👏"
    : "Cố lên, ôn lại rồi làm lại nhé! 💪";
  document.getElementById("resultHeadline").textContent = headline;

  const ring = document.getElementById("resultRing");
  const circumference = 2 * Math.PI * 52;
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${circumference * (1 - result.pct / 100)}`;

  const wrongListEl = document.getElementById("resultWrongList");
  const reviewBtn = document.getElementById("btnReviewWrongResult");
  if (result.wrongWords.length) {
    wrongListEl.innerHTML = result.wrongWords.map(w => `
      <div class="wrong-item"><span>${LessonsView.escapeHTML(w.en)}</span><span>${LessonsView.escapeHTML(w.vi)}</span></div>
    `).join("");
    reviewBtn.classList.remove("hidden");
  } else {
    wrongListEl.innerHTML = "";
    reviewBtn.classList.add("hidden");
  }

  document.getElementById("btnRetryQuiz").onclick = () => startQuizSession(AppState.currentLessonWords);
  reviewBtn.onclick = () => {
    const words = result.wrongWords
      .map(w => AppState.currentLessonWords.find(cw => cw.id === w.id))
      .filter(Boolean);
    startQuizSession(words);
  };
}

document.getElementById("btnExitQuiz").addEventListener("click", () => {
  navigateTo(`#/lesson/${encodeLesson(AppState.currentLessonName)}`);
});
document.getElementById("btnBackToLesson").addEventListener("click", () => {
  navigateTo(`#/lesson/${encodeLesson(AppState.currentLessonName)}`);
});

// ============================================================== Achievements
function openAchievements() {
  showView("achievements");
  const stats = Progress.getGlobalStats(AppState.lessonsMeta);
  const unlockedNow = Achievements.check(stats); // kiểm tra lại phòng khi có thay đổi ngoài luồng
  renderAchievements(unlockedNow.map(a => a.id));
  unlockedNow.forEach(a => Toast.show(`🏆 Mở khoá huy hiệu: ${a.title}`));
}

function renderAchievements(justUnlockedIds = []) {
  const unlocked = Progress.getUnlockedAchievements();
  const grid = document.getElementById("achvGrid");
  grid.innerHTML = Achievements.all().map(a => {
    const isUnlocked = unlocked.includes(a.id);
    const justUnlocked = justUnlockedIds.includes(a.id);
    return `<div class="achv-card ${isUnlocked ? "" : "locked"} ${justUnlocked ? "pop" : ""}">
      <div class="achv-icon">${a.icon}</div>
      <div class="achv-title">${a.title}</div>
      <div class="achv-desc">${a.desc}</div>
    </div>`;
  }).join("");
}

/** Gọi mỗi khi có thay đổi tiến độ (đánh giá flashcard, nộp quiz...) để cập nhật số liệu + kiểm tra huy hiệu mới */
function onProgressChanged() {
  updateLessonProgressBar();
  renderStatGrid();
  const stats = Progress.getGlobalStats(AppState.lessonsMeta);
  const unlockedNow = Achievements.check(stats);
  unlockedNow.forEach(a => Toast.show(`🏆 Mở khoá huy hiệu: ${a.title}`));
}

// ============================================================== Navigation bindings
document.querySelectorAll("[data-route]").forEach(btn => {
  btn.addEventListener("click", () => navigateTo(btn.dataset.route));
});

// ============================================================== Theme
function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const isDark = theme === "dark";
  const label = isDark ? "☀️ Chế độ sáng" : "🌙 Chế độ tối";
  const icon = isDark ? "☀️" : "🌙";
  document.getElementById("themeToggleLabel").textContent = label;
  document.getElementById("themeToggleIcon").textContent = icon;
  document.getElementById("mobileThemeToggle").textContent = icon;
}

function toggleTheme() {
  const next = Progress.getTheme() === "dark" ? "light" : "dark";
  Progress.setTheme(next);
  applyTheme(next);
}

document.getElementById("themeToggle").addEventListener("click", toggleTheme);
document.getElementById("mobileThemeToggle").addEventListener("click", toggleTheme);

// ============================================================== Search (header + mobile modal)
Search.attachGlobalSearch(
  document.getElementById("globalSearchInput"),
  document.getElementById("globalSearchResults"),
  (word) => navigateTo(`#/lesson/${encodeLesson(word.lesson)}`)
);

document.getElementById("bottomNavSearch").addEventListener("click", openMobileSearchModal);

function openMobileSearchModal() {
  const box = document.getElementById("modalBox");
  box.innerHTML = `
    <h3 class="modal-title">Tìm kiếm từ vựng</h3>
    <div class="search-wrap" style="max-width:none;">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <input type="text" class="search-input" id="mobileSearchInput" placeholder="Tìm kiếm từ vựng..." autocomplete="off" />
      <div class="search-results" id="mobileSearchResults" style="position:static;box-shadow:none;border:none;margin-top:10px;max-height:300px;"></div>
    </div>
    <div class="modal-actions"><button class="btn btn-secondary" id="mobileSearchCloseBtn">Đóng</button></div>`;

  document.getElementById("modalOverlay").classList.add("open");
  document.getElementById("mobileSearchCloseBtn").addEventListener("click", closeModal);

  Search.attachGlobalSearch(
    document.getElementById("mobileSearchInput"),
    document.getElementById("mobileSearchResults"),
    (word) => { closeModal(); navigateTo(`#/lesson/${encodeLesson(word.lesson)}`); }
  );
  document.getElementById("mobileSearchInput").focus();
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
}
document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target.id === "modalOverlay") closeModal();
});

// ============================================================== Khởi động ứng dụng
(function init() {
  applyTheme(Progress.getTheme());
  if (!SheetsAPI.isConfigured()) {
    Toast.show("⚙️ Chưa kết nối Google Sheets — đang hiển thị dữ liệu mẫu. Cấu hình API_URL trong js/config.js.", 5000);
  }
  handleRoute();
})();

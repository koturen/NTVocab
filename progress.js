/**
 * progress.js
 * ---------------------------------------------------------------------------
 * Quản lý TOÀN BỘ tiến độ học tập của người dùng. Hiện tại lưu bằng
 * LocalStorage, nhưng mọi truy cập dữ liệu đều đi qua các hàm ở module này
 * — nên sau này muốn chuyển sang lưu trên Google Sheets (ví dụ đồng bộ theo
 * tài khoản), ta chỉ cần viết lại phần đọc/ghi bên trong `loadState()` /
 * `saveState()` mà không phải sửa bất kỳ nơi nào khác trong ứng dụng.
 * ---------------------------------------------------------------------------
 */
const Progress = (() => {
  const STORAGE_KEY = "vocalearn_progress_v1";

  const DEFAULT_STATE = () => ({
    theme: "light",
    streak: { count: 0, lastStudyDate: null },
    lessons: {}, // { [lessonName]: LessonProgress }
    unlockedAchievements: [],
    createdAt: new Date().toISOString(),
  });

  const DEFAULT_LESSON = () => ({
    wordStatus: {},     // { [wordId]: 'unseen' | 'hard' | 'known' }
    favorites: [],       // [wordId]
    quizScores: [],       // [{ correct, total, pct, date }]
    started: false,
    completed: false,
  });

  let state = null;

  function loadState() {
    if (state) return state;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? { ...DEFAULT_STATE(), ...JSON.parse(raw) } : DEFAULT_STATE();
    } catch (e) {
      console.error("Không đọc được tiến độ đã lưu, dùng dữ liệu mặc định.", e);
      state = DEFAULT_STATE();
    }
    return state;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Không lưu được tiến độ (LocalStorage đầy hoặc bị chặn).", e);
    }
  }

  function getLesson(lessonName) {
    const s = loadState();
    if (!s.lessons[lessonName]) s.lessons[lessonName] = DEFAULT_LESSON();
    return s.lessons[lessonName];
  }

  // ---------------------------------------------------------------- Words
  function setWordStatus(lessonName, wordId, status) {
    const lesson = getLesson(lessonName);
    lesson.wordStatus[wordId] = status;
    lesson.started = true;
    touchStreak();
    saveState();
  }

  function getWordStatus(lessonName, wordId) {
    const lesson = getLesson(lessonName);
    return lesson.wordStatus[wordId] || "unseen";
  }

  function toggleFavorite(lessonName, wordId) {
    const lesson = getLesson(lessonName);
    const idx = lesson.favorites.indexOf(wordId);
    if (idx >= 0) lesson.favorites.splice(idx, 1);
    else lesson.favorites.push(wordId);
    saveState();
    return lesson.favorites.includes(wordId);
  }

  function isFavorite(lessonName, wordId) {
    return getLesson(lessonName).favorites.includes(wordId);
  }

  // ---------------------------------------------------------------- Quiz
  function recordQuizResult(lessonName, correct, total) {
    const lesson = getLesson(lessonName);
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    lesson.quizScores.push({ correct, total, pct, date: new Date().toISOString() });
    lesson.started = true;
    touchStreak();
    saveState();
    return pct;
  }

  function getBestQuizScore(lessonName) {
    const lesson = getLesson(lessonName);
    return lesson.quizScores.reduce((max, s) => Math.max(max, s.pct), 0);
  }

  function getLastQuizScore(lessonName) {
    const lesson = getLesson(lessonName);
    if (!lesson.quizScores.length) return null;
    return lesson.quizScores[lesson.quizScores.length - 1].pct;
  }

  // ---------------------------------------------------------------- Lesson status
  /** Tính trạng thái bài học dựa trên số từ đã được đánh giá so với tổng số từ */
  function computeLessonStatus(lessonName, totalWords) {
    const lesson = getLesson(lessonName);
    if (!lesson.started || totalWords === 0) return "new";
    const seen = Object.keys(lesson.wordStatus).length;
    const known = Object.values(lesson.wordStatus).filter(s => s === "known").length;
    if (known >= totalWords) {
      lesson.completed = true;
      saveState();
      return "done";
    }
    if (seen > 0) return "progress";
    return "new";
  }

  function getLessonWordProgressPct(lessonName, totalWords) {
    if (!totalWords) return 0;
    const lesson = getLesson(lessonName);
    const known = Object.values(lesson.wordStatus).filter(s => s === "known").length;
    return Math.round((known / totalWords) * 100);
  }

  // ---------------------------------------------------------------- Streak
  function touchStreak() {
    const s = loadState();
    const today = new Date().toISOString().slice(0, 10);
    if (s.streak.lastStudyDate === today) return; // đã tính hôm nay rồi

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (s.streak.lastStudyDate === yesterday) {
      s.streak.count += 1;
    } else {
      s.streak.count = 1; // streak bị đứt, bắt đầu lại
    }
    s.streak.lastStudyDate = today;
  }

  function getStreak() {
    return loadState().streak.count;
  }

  // ---------------------------------------------------------------- Theme
  function getTheme() {
    return loadState().theme;
  }
  function setTheme(theme) {
    loadState().theme = theme;
    saveState();
  }

  // ---------------------------------------------------------------- Achievements
  function unlockAchievement(id) {
    const s = loadState();
    if (s.unlockedAchievements.includes(id)) return false;
    s.unlockedAchievements.push(id);
    saveState();
    return true;
  }
  function getUnlockedAchievements() {
    return loadState().unlockedAchievements;
  }

  // ---------------------------------------------------------------- Global stats
  /**
   * @param {Array<{name:string, wordCount:number}>} lessonsMeta
   */
  function getGlobalStats(lessonsMeta) {
    const s = loadState();
    let totalWords = 0;
    let totalWordsKnown = 0;
    let completedLessons = 0;
    let bestQuizScore = 0;

    lessonsMeta.forEach(({ name, wordCount }) => {
      totalWords += wordCount;
      const lesson = getLesson(name);
      const known = Object.values(lesson.wordStatus).filter(st => st === "known").length;
      totalWordsKnown += known;
      if (known >= wordCount && wordCount > 0) completedLessons += 1;
      lesson.quizScores.forEach(q => { if (q.pct > bestQuizScore) bestQuizScore = q.pct; });
    });

    return {
      totalLessons: lessonsMeta.length,
      totalWords,
      completedLessons,
      totalWordsKnown,
      bestQuizScore,
      streak: s.streak.count,
    };
  }

  /** Trả về danh sách wordId đã bị đánh giá "hard" hoặc "unseen" (chưa nhớ) trong 1 bài */
  function getStrugglingWordIds(lessonName) {
    const lesson = getLesson(lessonName);
    return Object.entries(lesson.wordStatus)
      .filter(([, status]) => status === "hard" || status === "unseen")
      .map(([id]) => id);
  }

  function resetAll() {
    state = DEFAULT_STATE();
    saveState();
  }

  return {
    getLesson, setWordStatus, getWordStatus, toggleFavorite, isFavorite,
    recordQuizResult, getBestQuizScore, getLastQuizScore,
    computeLessonStatus, getLessonWordProgressPct,
    getStreak, touchStreak,
    getTheme, setTheme,
    unlockAchievement, getUnlockedAchievements,
    getGlobalStats, getStrugglingWordIds, resetAll,
  };
})();

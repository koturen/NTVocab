/**
 * lessons.js
 * ---------------------------------------------------------------------------
 * Chịu trách nhiệm RENDER (vẽ giao diện) cho:
 *   - Danh sách bài học ở trang chủ (lesson cards)
 *   - Danh sách bài học rút gọn ở sidebar
 *   - Danh sách từ vựng trong trang chi tiết bài học
 * Module này không tự gọi API — dữ liệu được app.js truyền vào.
 * ---------------------------------------------------------------------------
 */
const LessonsView = (() => {
  const statusLabel = { new: "Chưa học", progress: "Đang học", done: "Đã hoàn thành" };
  const statusBadgeClass = { new: "badge-new", progress: "badge-progress", done: "badge-done" };

  /** Vẽ danh sách lesson card ở Dashboard. `onOpen(lessonName)` được gọi khi bấm "Bắt đầu học". */
  function renderLessonCards(container, lessonsMeta, onOpen) {
    if (!lessonsMeta.length) {
      container.innerHTML = emptyStateHTML("📭", "Chưa có bài học nào", "Hãy thêm ít nhất một Sheet/Tab từ vựng vào Google Sheets của bạn.");
      return;
    }

    container.innerHTML = `<div class="lesson-grid">${lessonsMeta.map(l => lessonCardHTML(l)).join("")}</div>`;

    container.querySelectorAll("[data-open-lesson]").forEach(btn => {
      btn.addEventListener("click", () => onOpen(btn.dataset.openLesson));
    });
  }

  function lessonCardHTML(l) {
    const status = Progress.computeLessonStatus(l.name, l.wordCount);
    const pct = Progress.getLessonWordProgressPct(l.name, l.wordCount);
    const lastScore = Progress.getLastQuizScore(l.name);

    return `
      <div class="lesson-card">
        <div class="lesson-card-top">
          <div>
            <p class="lesson-card-title">${escapeHTML(l.name)}</p>
            <p class="lesson-card-count">${l.wordCount} từ vựng</p>
          </div>
          <span class="badge ${statusBadgeClass[status]}">${statusLabel[status]}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="lesson-card-meta">
          <span>${pct}% tiến độ</span>
          <span>${lastScore !== null ? `Quiz gần nhất: ${lastScore}%` : "Chưa làm quiz"}</span>
        </div>
        <div class="lesson-card-actions">
          <button class="btn btn-primary btn-sm flex-1" data-open-lesson="${escapeAttr(l.name)}">Bắt đầu học</button>
        </div>
      </div>`;
  }

  /** Vẽ danh sách rút gọn ở sidebar. `onOpen(lessonName)` khi bấm 1 bài. */
  function renderSidebarList(container, lessonsMeta, onOpen) {
    container.innerHTML = lessonsMeta.map(l => {
      const status = Progress.computeLessonStatus(l.name, l.wordCount);
      const dotClass = status === "done" ? "done" : status === "progress" ? "progress" : "";
      return `<button class="lesson-nav-item" data-open-lesson="${escapeAttr(l.name)}">
        <span style="display:flex;align-items:center;gap:8px;overflow:hidden;">
          <span class="lesson-nav-dot ${dotClass}"></span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(l.name)}</span>
        </span>
      </button>`;
    }).join("");

    container.querySelectorAll("[data-open-lesson]").forEach(btn => {
      btn.addEventListener("click", () => onOpen(btn.dataset.openLesson));
    });
  }

  /**
   * Vẽ danh sách từ vựng trong trang chi tiết bài học.
   * @param {Array} words - danh sách từ (đã lọc theo từ khoá tìm kiếm nếu có)
   * @param {string} lessonName
   * @param {(wordId:string)=>void} onToggleFavorite
   */
  function renderWordList(container, words, lessonName, onToggleFavorite) {
    if (!words.length) {
      container.innerHTML = emptyStateHTML("🔎", "Không tìm thấy từ nào", "Thử một từ khoá khác.");
      return;
    }

    container.innerHTML = words.map(w => {
      const status = Progress.getWordStatus(lessonName, w.id);
      const fav = Progress.isFavorite(lessonName, w.id);
      return `
      <div class="word-row">
        <span class="word-status-dot ${status}" title="${statusDotTitle(status)}"></span>
        <div class="word-row-main">
          <span class="word-en">${escapeHTML(w.en)}</span>
          <span class="word-vi">${escapeHTML(w.vi)}</span>
          ${w.pos ? `<span class="word-pos">${escapeHTML(w.pos)}</span>` : ""}
          ${w.cefr ? `<span class="word-cefr">${escapeHTML(w.cefr)}</span>` : ""}
        </div>
        <button class="star-btn ${fav ? "active" : ""}" data-fav-id="${escapeAttr(w.id)}" aria-label="Yêu thích">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3l-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z"/></svg>
        </button>
      </div>`;
    }).join("");

    container.querySelectorAll("[data-fav-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const isFav = onToggleFavorite(btn.dataset.favId);
        btn.classList.toggle("active", isFav);
      });
    });
  }

  function statusDotTitle(status) {
    if (status === "known") return "Đã nhớ";
    if (status === "hard") return "Khó nhớ";
    return "Chưa nhớ";
  }

  function emptyStateHTML(icon, title, desc) {
    return `<div class="state-block">
      <div class="state-icon">${icon}</div>
      <div class="state-title">${title}</div>
      <div class="state-desc">${desc}</div>
    </div>`;
  }

  function loadingStateHTML(text = "Đang tải dữ liệu...") {
    return `<div class="state-block"><div class="spinner"></div><div class="state-title">${text}</div></div>`;
  }

  function errorStateHTML(message, onRetryId) {
    return `<div class="state-block">
      <div class="state-icon">⚠️</div>
      <div class="state-title">Không thể tải dữ liệu</div>
      <div class="state-desc">${escapeHTML(message)}</div>
      <button class="btn btn-primary btn-sm" id="${onRetryId}">Thử lại</button>
    </div>`;
  }

  function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(str) { return escapeHTML(str); }

  return { renderLessonCards, renderSidebarList, renderWordList, emptyStateHTML, loadingStateHTML, errorStateHTML, escapeHTML };
})();

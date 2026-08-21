/**
 * flashcards.js
 * ---------------------------------------------------------------------------
 * Điều khiển toàn bộ phiên học Flashcards: điều hướng, lật thẻ, đánh giá
 * (chưa nhớ / khó nhớ / đã nhớ), yêu thích, trộn thẻ, auto play.
 * ---------------------------------------------------------------------------
 */
const Flashcards = (() => {
  let el = {};
  let lessonName = null;
  let allWords = [];      // toàn bộ từ của bài học (không đổi trong suốt phiên)
  let sessionWords = [];  // danh sách đang hiển thị (đã lọc theo nhóm)
  let index = 0;
  let flipped = false;
  let currentGroup = "all";
  let random = false;
  let autoplay = false;
  let autoplayTimer = null;
  let onProgressChange = () => {};

  function cacheEls() {
    el = {
      scene: document.getElementById("flashcardScene"),
      card: document.getElementById("flashcardEl"),
      wordFront: document.getElementById("fcWordFront"),
      wordBack: document.getElementById("fcWordBack"),
      pos: document.getElementById("fcPos"),
      cefr: document.getElementById("fcCefr"),
      index: document.getElementById("fcIndex"),
      total: document.getElementById("fcTotal"),
      favBtn: document.getElementById("fcFavBtn"),
      prevBtn: document.getElementById("fcPrevBtn"),
      nextBtn: document.getElementById("fcNextBtn"),
      revealBtn: document.getElementById("fcRevealBtn"),
      ratingRow: document.getElementById("fcRatingRow"),
      randomToggle: document.getElementById("fcRandomToggle"),
      autoplayToggle: document.getElementById("fcAutoplayToggle"),
      speedSelect: document.getElementById("fcSpeedSelect"),
      groupTabs: document.getElementById("flashcardGroupTabs"),
      title: document.getElementById("flashcardsLessonTitle"),
    };
  }

  function bindEventsOnce() {
    if (bindEventsOnce._bound) return;
    bindEventsOnce._bound = true;

    el.card.addEventListener("click", () => setFlipped(!flipped));
    el.revealBtn.addEventListener("click", (e) => { e.stopPropagation(); setFlipped(!flipped); });
    el.prevBtn.addEventListener("click", () => goTo(index - 1));
    el.nextBtn.addEventListener("click", () => goTo(index + 1, true));

    el.favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const word = sessionWords[index];
      if (!word) return;
      const isFav = Progress.toggleFavorite(lessonName, word.id);
      el.favBtn.classList.toggle("active", isFav);
    });

    el.ratingRow.querySelectorAll(".rating-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const word = sessionWords[index];
        if (!word) return;
        Progress.setWordStatus(lessonName, word.id, btn.dataset.status);
        highlightRating(btn.dataset.status);
        onProgressChange();
        // tự động sang từ tiếp theo sau khi đánh giá để giữ nhịp học
        setTimeout(() => goTo(index + 1, true), 220);
      });
    });

    el.randomToggle.addEventListener("change", (e) => {
      random = e.target.checked;
      rebuildSession(currentGroup, true);
    });

    el.autoplayToggle.addEventListener("change", (e) => {
      autoplay = e.target.checked;
      autoplay ? startAutoplay() : stopAutoplay();
    });

    el.speedSelect.addEventListener("change", () => {
      if (autoplay) { stopAutoplay(); startAutoplay(); }
    });

    el.groupTabs.querySelectorAll(".group-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        el.groupTabs.querySelectorAll(".group-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        rebuildSession(tab.dataset.group);
      });
    });

    // Bàn phím: mũi tên trái/phải để chuyển thẻ, cách để lật thẻ
    document.addEventListener("keydown", (e) => {
      const view = document.getElementById("view-flashcards");
      if (!view.classList.contains("active")) return;
      if (e.key === "ArrowRight") goTo(index + 1, true);
      else if (e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key === " ") { e.preventDefault(); setFlipped(!flipped); }
    });
  }

  function wordsByGroup(group) {
    if (group === "favorite") return allWords.filter(w => Progress.isFavorite(lessonName, w.id));
    if (group === "all") return allWords.slice();
    return allWords.filter(w => Progress.getWordStatus(lessonName, w.id) === group);
  }

  function rebuildSession(group, keepGroup) {
    currentGroup = group;
    let words = wordsByGroup(group);
    if (random) words = shuffle(words);
    sessionWords = words;
    index = 0;
    flipped = false;
    if (!keepGroup) {
      el.groupTabs.querySelectorAll(".group-tab").forEach(t => t.classList.toggle("active", t.dataset.group === group));
    }
    render();
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setFlipped(val) {
    flipped = val;
    el.card.classList.toggle("flipped", flipped);
  }

  function goTo(newIndex, wrap) {
    if (!sessionWords.length) return;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= sessionWords.length) {
      if (wrap) { stopAutoplay(); Toast.show("🎉 Bạn đã ôn hết lượt thẻ này!"); return; }
      newIndex = sessionWords.length - 1;
    }
    index = newIndex;
    flipped = false;
    render();
  }

  function highlightRating(status) {
    el.ratingRow.querySelectorAll(".rating-btn").forEach(b => b.classList.toggle("active", b.dataset.status === status));
  }

  function render() {
    const word = sessionWords[index];
    el.total.textContent = sessionWords.length;
    el.index.textContent = sessionWords.length ? index + 1 : 0;
    el.card.classList.toggle("flipped", flipped);
    el.prevBtn.disabled = index <= 0;
    el.nextBtn.disabled = index >= sessionWords.length - 1;

    if (!word) {
      el.wordFront.textContent = "—";
      el.wordBack.textContent = "Không có thẻ nào trong nhóm này";
      el.pos.textContent = "";
      el.cefr.textContent = "";
      el.favBtn.classList.remove("active");
      highlightRating(null);
      return;
    }

    el.wordFront.textContent = word.en;
    el.wordBack.textContent = word.vi;
    el.pos.textContent = word.pos || "";
    el.cefr.textContent = word.cefr || "";
    el.favBtn.classList.toggle("active", Progress.isFavorite(lessonName, word.id));
    highlightRating(Progress.getWordStatus(lessonName, word.id));
  }

  function startAutoplay() {
    stopAutoplay();
    const speed = parseInt(el.speedSelect.value, 10) || 5000;
    autoplayTimer = setInterval(() => {
      if (!flipped) setFlipped(true);
      else goTo(index + 1, true);
    }, speed);
  }

  function stopAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  /**
   * Bắt đầu phiên Flashcards.
   * @param {string} lesson
   * @param {Array} words - toàn bộ từ vựng của bài học
   * @param {string} initialGroup - 'all' | 'unseen' | 'hard' | 'known' | 'favorite'
   * @param {Function} progressChangeCb - gọi mỗi khi có thay đổi tiến độ (để app.js cập nhật achievement/stat)
   */
  function start(lesson, words, initialGroup = "all", progressChangeCb = () => {}) {
    cacheEls();
    bindEventsOnce();
    lessonName = lesson;
    allWords = words;
    onProgressChange = progressChangeCb;
    random = el.randomToggle.checked;
    autoplay = false;
    el.autoplayToggle.checked = false;
    el.title.textContent = `Flashcards — ${lesson}`;
    rebuildSession(initialGroup);
  }

  function stop() {
    stopAutoplay();
  }

  return { start, stop };
})();

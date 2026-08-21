/**
 * search.js
 * ---------------------------------------------------------------------------
 * Tìm kiếm nhanh:
 *  - Tìm kiếm TOÀN BỘ database (header) theo English hoặc Vietnamese, realtime.
 *  - Tìm kiếm trong PHẠM VI một bài học (trang chi tiết bài học).
 * ---------------------------------------------------------------------------
 */
const Search = (() => {
  function normalize(s) {
    return String(s ?? "").toLowerCase().trim();
  }

  function matches(word, term) {
    const t = normalize(term);
    return normalize(word.en).includes(t) || normalize(word.vi).includes(t);
  }

  function filterWords(words, term) {
    if (!term.trim()) return [];
    return words.filter(w => matches(w, term)).slice(0, 30);
  }

  /**
   * Gắn sự kiện cho ô tìm kiếm toàn cục ở header.
   * @param {HTMLInputElement} inputEl
   * @param {HTMLElement} resultsEl
   * @param {(word:Object)=>void} onSelectWord
   */
  function attachGlobalSearch(inputEl, resultsEl, onSelectWord) {
    let debounceTimer = null;

    async function runSearch(term) {
      if (!term.trim()) {
        resultsEl.classList.remove("open");
        resultsEl.innerHTML = "";
        return;
      }
      try {
        const all = await SheetsAPI.getAllVocabulary();
        const results = filterWords(all, term);
        renderResults(resultsEl, results, onSelectWord, term);
      } catch (e) {
        resultsEl.innerHTML = `<div class="search-empty">Không thể tải dữ liệu tìm kiếm.</div>`;
        resultsEl.classList.add("open");
      }
    }

    inputEl.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      const term = inputEl.value;
      debounceTimer = setTimeout(() => runSearch(term), 150);
    });

    inputEl.addEventListener("focus", () => {
      if (inputEl.value.trim()) resultsEl.classList.add("open");
    });

    document.addEventListener("click", (e) => {
      if (!resultsEl.contains(e.target) && e.target !== inputEl) {
        resultsEl.classList.remove("open");
      }
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { resultsEl.classList.remove("open"); inputEl.blur(); }
    });
  }

  function renderResults(resultsEl, results, onSelectWord, term) {
    if (!results.length) {
      resultsEl.innerHTML = `<div class="search-empty">Không tìm thấy từ nào khớp với "${LessonsView.escapeHTML(term)}"</div>`;
      resultsEl.classList.add("open");
      return;
    }
    resultsEl.innerHTML = results.map(w => `
      <div class="search-result-item" data-word-id="${LessonsView.escapeHTML(w.id)}">
        <div>
          <div class="search-result-word">${LessonsView.escapeHTML(w.en)}</div>
          <div class="search-result-meaning">${LessonsView.escapeHTML(w.vi)}</div>
        </div>
        <span class="search-result-lesson">${LessonsView.escapeHTML(w.lesson)}</span>
      </div>`).join("");

    resultsEl.querySelectorAll("[data-word-id]").forEach(item => {
      const word = results.find(r => r.id === item.dataset.wordId);
      item.addEventListener("click", () => {
        resultsEl.classList.remove("open");
        onSelectWord(word);
      });
    });
    resultsEl.classList.add("open");
  }

  /**
   * Gắn sự kiện tìm kiếm trong phạm vi 1 bài học.
   * @param {HTMLInputElement} inputEl
   * @param {()=>Array} getAllWords - hàm trả về toàn bộ từ của bài học hiện tại
   * @param {(filtered:Array)=>void} onFilter
   */
  function attachLessonSearch(inputEl, getAllWords, onFilter) {
    inputEl.addEventListener("input", () => {
      const term = inputEl.value;
      const all = getAllWords();
      onFilter(term.trim() ? all.filter(w => matches(w, term)) : all);
    });
  }

  return { attachGlobalSearch, attachLessonSearch, filterWords };
})();

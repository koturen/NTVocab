/**
 * quiz.js
 * ---------------------------------------------------------------------------
 * Sinh câu hỏi trắc nghiệm (Anh→Việt và Việt→Anh), chấm điểm, và trả kết quả
 * (điểm số, số câu đúng/sai, danh sách từ trả lời sai) cho app.js hiển thị
 * ở màn hình kết quả.
 * ---------------------------------------------------------------------------
 */
const Quiz = (() => {
  let el = {};
  let lessonName = null;
  let questions = [];
  let qIndex = 0;
  let correctCount = 0;
  let wrongWords = []; // [{ id, en, vi }]
  let answered = false;
  let onFinish = () => {};

  function cacheEls() {
    el = {
      exitBtn: document.getElementById("btnExitQuiz"),
      progressFill: document.getElementById("quizProgressFill"),
      indexLabel: document.getElementById("quizIndex"),
      totalLabel: document.getElementById("quizTotal"),
      directionLabel: document.getElementById("quizDirectionLabel"),
      questionText: document.getElementById("quizQuestionText"),
      options: document.getElementById("quizOptions"),
      explain: document.getElementById("quizExplain"),
      nextBtn: document.getElementById("quizNextBtn"),
    };
  }

  function bindEventsOnce() {
    if (bindEventsOnce._bound) return;
    bindEventsOnce._bound = true;
    el.nextBtn.addEventListener("click", () => {
      qIndex += 1;
      if (qIndex >= questions.length) {
        onFinish(buildResult());
      } else {
        renderQuestion();
      }
    });
  }

  /** Xáo mảng (Fisher-Yates) không làm thay đổi mảng gốc */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Sinh danh sách câu hỏi từ danh sách từ vựng của bài học (hoặc tập con khi "ôn từ sai") */
  function buildQuestions(words) {
    const combos = [];
    words.forEach(w => {
      combos.push({ word: w, dir: "en2vi" });
      combos.push({ word: w, dir: "vi2en" });
    });
    const shuffledCombos = shuffle(combos);
    const target = Math.min(20, Math.max(Math.min(10, words.length), Math.min(words.length, shuffledCombos.length)));
    const picked = shuffledCombos.slice(0, Math.max(target, Math.min(10, shuffledCombos.length)));

    return picked.map(({ word, dir }) => {
      const correctText = dir === "en2vi" ? word.vi : word.en;
      const pool = words.filter(w => w.id !== word.id);
      const distractors = shuffle(pool)
        .slice(0, Math.min(3, pool.length))
        .map(w => (dir === "en2vi" ? w.vi : w.en));
      const options = shuffle([correctText, ...distractors]);
      return {
        word,
        dir,
        prompt: dir === "en2vi" ? word.en : word.vi,
        correctText,
        options,
      };
    });
  }

  function renderQuestion() {
    answered = false;
    const q = questions[qIndex];
    el.indexLabel.textContent = qIndex + 1;
    el.totalLabel.textContent = questions.length;
    el.progressFill.style.width = `${(qIndex / questions.length) * 100}%`;
    el.directionLabel.textContent = q.dir === "en2vi" ? "Chọn nghĩa tiếng Việt đúng" : "Chọn từ tiếng Anh đúng";
    el.questionText.textContent = q.prompt;
    el.explain.classList.add("hidden");
    el.nextBtn.classList.add("hidden");

    el.options.innerHTML = q.options.map(opt =>
      `<button class="quiz-option" data-value="${LessonsView.escapeHTML(opt)}">${LessonsView.escapeHTML(opt)}</button>`
    ).join("");

    el.options.querySelectorAll(".quiz-option").forEach(btn => {
      btn.addEventListener("click", () => handleAnswer(btn, q));
    });
  }

  function handleAnswer(btn, q) {
    if (answered) return;
    answered = true;
    const chosen = btn.dataset.value;
    const isCorrect = chosen === q.correctText;

    el.options.querySelectorAll(".quiz-option").forEach(b => {
      b.disabled = true;
      if (b.dataset.value === q.correctText) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });

    if (isCorrect) {
      correctCount += 1;
    } else {
      wrongWords.push({ id: q.word.id, en: q.word.en, vi: q.word.vi });
    }

    const explainParts = [];
    if (q.word.pos) explainParts.push(`Loại từ: ${q.word.pos}`);
    if (q.word.cefr) explainParts.push(`CEFR: ${q.word.cefr}`);
    el.explain.innerHTML = `${isCorrect ? "✅ Chính xác!" : `❌ Sai rồi. Đáp án đúng: <strong>${LessonsView.escapeHTML(q.correctText)}</strong>`}` +
      (explainParts.length ? `<br/>${explainParts.join(" · ")}` : "");
    el.explain.classList.remove("hidden");

    el.progressFill.style.width = `${((qIndex + 1) / questions.length) * 100}%`;
    el.nextBtn.textContent = qIndex + 1 >= questions.length ? "Xem kết quả →" : "Câu tiếp theo →";
    el.nextBtn.classList.remove("hidden");
  }

  function buildResult() {
    return {
      lessonName,
      total: questions.length,
      correct: correctCount,
      wrong: questions.length - correctCount,
      pct: questions.length ? Math.round((correctCount / questions.length) * 100) : 0,
      wrongWords,
    };
  }

  /**
   * @param {string} lesson
   * @param {Array} words - nguồn từ để tạo câu hỏi (toàn bộ bài, hoặc chỉ từ trả lời sai khi "Ôn từ sai")
   * @param {Function} onFinishCb - gọi khi hoàn thành quiz, nhận vào object kết quả
   */
  function start(lesson, words, onFinishCb) {
    cacheEls();
    bindEventsOnce();
    lessonName = lesson;
    qIndex = 0;
    correctCount = 0;
    wrongWords = [];
    onFinish = onFinishCb;
    questions = buildQuestions(words);
    renderQuestion();
  }

  return { start };
})();

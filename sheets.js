/**
 * sheets.js
 * ---------------------------------------------------------------------------
 * Module DUY NHẤT chịu trách nhiệm giao tiếp với Google Sheets thông qua
 * Google Apps Script Web App API. Không có phần nào khác trong ứng dụng được
 * gọi fetch() trực tiếp tới Apps Script — mọi nơi khác chỉ gọi các hàm ở đây.
 *
 * API cung cấp (khớp với Google Apps Script mẫu trong /google-apps-script):
 *   getLessons()            -> [{ name, wordCount }]
 *   getLessonWords(name)    -> [{ id, stt, en, vi, pos, cefr }]
 *   getAllVocabulary()      -> [{ id, lesson, stt, en, vi, pos, cefr }]
 * ---------------------------------------------------------------------------
 */
const SheetsAPI = (() => {
  // Cache trong bộ nhớ (session) để giảm số lần gọi mạng
  const cache = { lessons: null, lessonsAt: 0, words: new Map(), allVocab: null, allVocabAt: 0 };

  function isConfigured() {
    return APP_CONFIG.API_URL && APP_CONFIG.API_URL !== "YOUR_GOOGLE_APPS_SCRIPT_URL";
  }

  function fresh(ts) {
    return ts && (Date.now() - ts) < APP_CONFIG.CACHE_TTL_MS;
  }

  async function callApi(action, params = {}) {
    const url = new URL(APP_CONFIG.API_URL);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      throw new Error(`Lỗi API (${res.status}) khi gọi action=${action}`);
    }
    const json = await res.json();
    if (json && json.error) {
      throw new Error(json.error);
    }
    return json;
  }

  /** Trả về danh sách bài học: [{ name, wordCount }] */
  async function getLessons() {
    if (fresh(cache.lessonsAt) && cache.lessons) return cache.lessons;

    if (!isConfigured()) {
      if (APP_CONFIG.USE_DEMO_DATA_WHEN_UNCONFIGURED) {
        const lessons = DemoData.lessons.map(l => ({ name: l.name, wordCount: l.words.length }));
        cache.lessons = lessons;
        cache.lessonsAt = Date.now();
        return lessons;
      }
      throw new Error("Chưa cấu hình API_URL trong js/config.js");
    }

    const data = await callApi("lessons");
    // Chuẩn hoá dữ liệu trả về từ Apps Script
    const lessons = (data.lessons || data || []).map(l => ({
      name: l.name,
      wordCount: l.wordCount ?? l.count ?? 0,
    }));
    cache.lessons = lessons;
    cache.lessonsAt = Date.now();
    return lessons;
  }

  /** Trả về danh sách từ vựng của MỘT bài học: [{ id, stt, en, vi, pos, cefr }] */
  async function getLessonWords(sheetName) {
    const cached = cache.words.get(sheetName);
    if (cached && fresh(cached.at)) return cached.data;

    let rows;
    if (!isConfigured()) {
      if (APP_CONFIG.USE_DEMO_DATA_WHEN_UNCONFIGURED) {
        const lesson = DemoData.lessons.find(l => l.name === sheetName);
        rows = lesson ? lesson.words : [];
      } else {
        throw new Error("Chưa cấu hình API_URL trong js/config.js");
      }
    } else {
      const data = await callApi("lesson", { name: sheetName });
      rows = data.words || data || [];
    }

    const words = normalizeWords(rows, sheetName);
    cache.words.set(sheetName, { data: words, at: Date.now() });
    return words;
  }

  /** Trả về TOÀN BỘ từ vựng của mọi bài học (dùng cho tìm kiếm toàn cục) */
  async function getAllVocabulary() {
    if (fresh(cache.allVocabAt) && cache.allVocab) return cache.allVocab;

    if (!isConfigured()) {
      if (APP_CONFIG.USE_DEMO_DATA_WHEN_UNCONFIGURED) {
        const all = [];
        DemoData.lessons.forEach(l => normalizeWords(l.words, l.name).forEach(w => all.push(w)));
        cache.allVocab = all;
        cache.allVocabAt = Date.now();
        return all;
      }
      throw new Error("Chưa cấu hình API_URL trong js/config.js");
    }

    const data = await callApi("vocabulary");
    const rows = data.words || data || [];
    // Dữ liệu /vocabulary đã có sẵn trường "lesson" theo từng dòng
    const all = rows.map((r, i) => normalizeRow(r, r.lesson || r.Lesson || "", i));
    cache.allVocab = all;
    cache.allVocabAt = Date.now();
    return all;
  }

  function normalizeWords(rows, lessonName) {
    return rows.map((r, i) => normalizeRow(r, lessonName, i));
  }

  function normalizeRow(r, lessonName, i) {
    const en = r.en ?? r.English ?? r.english ?? "";
    return {
      id: `${lessonName}::${en}`.toLowerCase().replace(/\s+/g, "-"),
      lesson: lessonName,
      stt: r.stt ?? r.STT ?? i + 1,
      en,
      vi: r.vi ?? r.Vietnamese ?? r.vietnamese ?? "",
      pos: r.pos ?? r["Loại từ"] ?? r.type ?? "",
      cefr: r.cefr ?? r.CEFR ?? r["CEFR Band"] ?? "",
    };
  }

  function clearCache() {
    cache.lessons = null;
    cache.lessonsAt = 0;
    cache.words.clear();
    cache.allVocab = null;
    cache.allVocabAt = 0;
  }

  return { getLessons, getLessonWords, getAllVocabulary, isConfigured, clearCache };
})();

/**
 * DemoData
 * ---------------------------------------------------------------------------
 * Dữ liệu mẫu chỉ dùng khi API_URL CHƯA được cấu hình, để bạn xem trước giao
 * diện hoạt động đầy đủ. Khi kết nối Google Sheets thật, dữ liệu này sẽ
 * không còn được sử dụng — toàn bộ từ vựng sẽ lấy từ Apps Script.
 * ---------------------------------------------------------------------------
 */
const DemoData = {
  lessons: [
    {
      name: "Lesson 01",
      words: [
        { stt: 1, en: "abandon", vi: "từ bỏ, bỏ rơi", pos: "verb", cefr: "B2" },
        { stt: 2, en: "ability", vi: "khả năng", pos: "noun", cefr: "A2" },
        { stt: 3, en: "absolutely", vi: "hoàn toàn, chắc chắn", pos: "adverb", cefr: "B1" },
        { stt: 4, en: "accurate", vi: "chính xác", pos: "adjective", cefr: "B2" },
        { stt: 5, en: "achieve", vi: "đạt được", pos: "verb", cefr: "B1" },
        { stt: 6, en: "adapt", vi: "thích nghi, thích ứng", pos: "verb", cefr: "B2" },
        { stt: 7, en: "advantage", vi: "lợi thế", pos: "noun", cefr: "B1" },
        { stt: 8, en: "afford", vi: "đủ khả năng (mua/làm gì)", pos: "verb", cefr: "B1" },
        { stt: 9, en: "aggressive", vi: "hung hăng, quyết liệt", pos: "adjective", cefr: "B2" },
        { stt: 10, en: "amazing", vi: "tuyệt vời, kinh ngạc", pos: "adjective", cefr: "A2" },
        { stt: 11, en: "ambitious", vi: "có tham vọng", pos: "adjective", cefr: "B2" },
        { stt: 12, en: "anxious", vi: "lo lắng", pos: "adjective", cefr: "B1" },
      ],
    },
    {
      name: "Lesson 02",
      words: [
        { stt: 1, en: "benefit", vi: "lợi ích", pos: "noun", cefr: "B1" },
        { stt: 2, en: "boost", vi: "thúc đẩy, tăng cường", pos: "verb", cefr: "B2" },
        { stt: 3, en: "brief", vi: "ngắn gọn", pos: "adjective", cefr: "B1" },
        { stt: 4, en: "capable", vi: "có năng lực", pos: "adjective", cefr: "B2" },
        { stt: 5, en: "challenge", vi: "thử thách", pos: "noun", cefr: "A2" },
        { stt: 6, en: "collaborate", vi: "hợp tác", pos: "verb", cefr: "B2" },
        { stt: 7, en: "commit", vi: "cam kết", pos: "verb", cefr: "B2" },
        { stt: 8, en: "consequence", vi: "hậu quả", pos: "noun", cefr: "B2" },
        { stt: 9, en: "consistent", vi: "nhất quán", pos: "adjective", cefr: "B2" },
        { stt: 10, en: "convenient", vi: "thuận tiện", pos: "adjective", cefr: "B1" },
      ],
    },
    {
      name: "Lesson 03",
      words: [
        { stt: 1, en: "determine", vi: "xác định, quyết định", pos: "verb", cefr: "B2" },
        { stt: 2, en: "efficient", vi: "hiệu quả", pos: "adjective", cefr: "B2" },
        { stt: 3, en: "enthusiastic", vi: "nhiệt tình, hào hứng", pos: "adjective", cefr: "B2" },
        { stt: 4, en: "essential", vi: "thiết yếu", pos: "adjective", cefr: "B1" },
        { stt: 5, en: "evaluate", vi: "đánh giá", pos: "verb", cefr: "B2" },
        { stt: 6, en: "flexible", vi: "linh hoạt", pos: "adjective", cefr: "B1" },
        { stt: 7, en: "generous", vi: "hào phóng", pos: "adjective", cefr: "B1" },
        { stt: 8, en: "genuine", vi: "chân thật", pos: "adjective", cefr: "B2" },
      ],
    },
  ],
};

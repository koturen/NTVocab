/**
 * Code.gs — Google Apps Script Web App API cho VocaLearn
 * ---------------------------------------------------------------------------
 * CÁCH HOẠT ĐỘNG
 * Mỗi Sheet/Tab trong Google Sheets = một bài học. Hàng đầu tiên là tiêu đề
 * cột theo đúng thứ tự:
 *
 *   STT | English | Vietnamese | Loại từ | CEFR Band
 *
 * File này expose một Web App (doGet) hỗ trợ 3 action, gọi qua query string:
 *
 *   ?action=lessons               -> danh sách bài học + số từ mỗi bài
 *   ?action=lesson&name=Lesson%2001 -> toàn bộ từ vựng của 1 bài học
 *   ?action=vocabulary            -> toàn bộ từ vựng của TẤT CẢ bài học
 *
 * CÁCH DEPLOY: xem hướng dẫn chi tiết trong README.md ở thư mục gốc.
 * ---------------------------------------------------------------------------
 */

// Nếu Sheet nào bạn KHÔNG muốn hiển thị thành bài học (ví dụ sheet ghi chú),
// thêm tên sheet đó vào danh sách này để bỏ qua.
const IGNORED_SHEETS = ["Config", "Notes", "Sheet1"];

function doGet(e) {
  try {
    const action = (e.parameter.action || "lessons").toLowerCase();
    let payload;

    if (action === "lessons") {
      payload = { lessons: getLessonsList() };
    } else if (action === "lesson") {
      const name = e.parameter.name;
      if (!name) return jsonResponse({ error: "Thiếu tham số 'name'." });
      payload = { name, words: getSheetWords(name) };
    } else if (action === "vocabulary") {
      payload = { words: getAllVocabulary() };
    } else {
      return jsonResponse({ error: `Action không hợp lệ: ${action}` });
    }

    return jsonResponse(payload);
  } catch (err) {
    return jsonResponse({ error: err.message || String(err) });
  }
}

/** Trả về [{ name, wordCount }] cho tất cả các sheet hợp lệ */
function getLessonsList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheets()
    .filter(sheet => !IGNORED_SHEETS.includes(sheet.getName()))
    .map(sheet => ({
      name: sheet.getName(),
      wordCount: Math.max(sheet.getLastRow() - 1, 0), // trừ hàng tiêu đề
    }))
    .filter(l => l.wordCount > 0);
}

/** Đọc toàn bộ từ vựng của MỘT sheet (bài học) theo tên */
function getSheetWords(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Không tìm thấy Sheet "${sheetName}"`);
  return readWordsFromSheet(sheet);
}

/** Đọc từ vựng của TẤT CẢ các sheet, mỗi từ có thêm trường "lesson" */
function getAllVocabulary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const all = [];
  ss.getSheets()
    .filter(sheet => !IGNORED_SHEETS.includes(sheet.getName()))
    .forEach(sheet => {
      readWordsFromSheet(sheet).forEach(w => {
        w.lesson = sheet.getName();
        all.push(w);
      });
    });
  return all;
}

/** Đọc dữ liệu 1 sheet thành mảng object { stt, en, vi, pos, cefr } */
function readWordsFromSheet(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return []; // chỉ có tiêu đề, chưa có dữ liệu

  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return values
    .filter(row => row[1] !== "" && row[1] !== null) // bỏ hàng trống (cột English rỗng)
    .map((row, i) => ({
      stt: row[0] || i + 1,
      en: String(row[1] || "").trim(),
      vi: String(row[2] || "").trim(),
      pos: String(row[3] || "").trim(),
      cefr: String(row[4] || "").trim(),
    }));
}

/** Trả JSON kèm header phù hợp cho Web App */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

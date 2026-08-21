/**
 * config.js
 * ---------------------------------------------------------------------------
 * Nơi duy nhất khai báo URL của Google Apps Script Web App.
 * Sau khi deploy Apps Script (xem README.md), dán URL dạng:
 *   https://script.google.com/macros/s/XXXXXXXXXXXX/exec
 * vào biến API_URL bên dưới.
 *
 * Không đặt bất kỳ API key bí mật nào ở đây — Apps Script Web App không cần
 * key vì đã được deploy ở chế độ "Anyone can access" (chỉ đọc dữ liệu công khai).
 * ---------------------------------------------------------------------------
 */
const APP_CONFIG = {
  // TODO: thay bằng URL Web App thật của bạn sau khi deploy Google Apps Script
  API_URL: "",

  // Thời gian cache dữ liệu lấy từ Google Sheets (ms) để tránh gọi API liên tục
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 phút

  // Nếu true và API_URL chưa được cấu hình, app sẽ dùng dữ liệu mẫu (demo)
  // để bạn có thể xem giao diện hoạt động trước khi kết nối Google Sheets thật.
  USE_DEMO_DATA_WHEN_UNCONFIGURED: true,
};

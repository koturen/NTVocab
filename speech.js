/**
 * speech.js
 * ---------------------------------------------------------------------------
 * PHÁT ÂM — tính năng này được yêu cầu triển khai SAU (xem mục 8 trong bản
 * mô tả yêu cầu), nên hiện tại chưa có nút 🔊 nào trong giao diện gọi tới
 * module này. Phần khung sườn bên dưới dùng Web Speech API
 * (SpeechSynthesis, miễn phí, chạy hoàn toàn phía trình duyệt) được để sẵn
 * để dễ dàng bật tính năng này trong tương lai mà không cần đổi kiến trúc.
 *
 * Cách dùng dự kiến khi triển khai:
 *   Speech.speak("abandon");                 // đọc với tốc độ mặc định
 *   Speech.speak("abandon", { rate: 0.8 });   // đọc chậm hơn
 *   Speech.pause();
 * ---------------------------------------------------------------------------
 */
const Speech = (() => {
  const supported = "speechSynthesis" in window;

  function speak(text, { rate = 1, lang = "en-US" } = {}) {
    if (!supported || !text) return;
    window.speechSynthesis.cancel(); // dừng câu đang đọc dở (nếu có)
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    window.speechSynthesis.speak(utter);
  }

  function pause() {
    if (supported) window.speechSynthesis.pause();
  }

  function isSupported() {
    return supported;
  }

  return { speak, pause, isSupported };
})();

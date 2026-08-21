# VocaLearn — Website học từ vựng tiếng Anh

Website học & ôn tập từ vựng tiếng Anh theo bài học, dữ liệu lấy trực tiếp từ
Google Sheets. Xây dựng bằng HTML + CSS + JavaScript thuần (không framework),
chạy tốt trên máy tính, tablet và điện thoại.

## Tính năng chính

- Dashboard: thống kê tổng quan (số bài học, số từ, streak, điểm quiz cao nhất...)
- Trang bài học: danh sách từ vựng, tìm kiếm trong bài, yêu thích
- Flashcards: lật thẻ, đánh giá Chưa nhớ / Khó nhớ / Đã nhớ, trộn thẻ, auto play
- Quiz trắc nghiệm 2 chiều (Anh→Việt, Việt→Anh), chấm điểm, ôn lại câu sai
- Tìm kiếm toàn bộ database ở header
- Theo dõi tiến độ, streak, huy hiệu (achievements)
- Dark mode / Light mode
- Toàn bộ tiến độ lưu ở LocalStorage (xem `js/progress.js`)

> Tính năng **Phát âm** (mục 8) và **Dịch nhanh / Quick Translate** (mục 10)
> đã được đánh dấu "làm sau" trong bản mô tả yêu cầu nên **chưa có nút nào
> trong giao diện**. Khung sườn `js/speech.js` (dùng Web Speech API, miễn phí)
> đã được chuẩn bị sẵn để bật tính năng đọc từ trong tương lai.

---

## 1. Cấu trúc project

```text
english-learning/
├── index.html
├── style.css
├── js/
│   ├── config.js        # nơi khai báo API_URL
│   ├── sheets.js         # gọi Google Apps Script API
│   ├── progress.js       # quản lý tiến độ (LocalStorage)
│   ├── achievements.js   # hệ thống huy hiệu
│   ├── lessons.js        # render dashboard + danh sách từ
│   ├── flashcards.js     # điều khiển phiên flashcards
│   ├── quiz.js           # sinh câu hỏi + chấm điểm quiz
│   ├── search.js         # tìm kiếm toàn cục + trong bài học
│   ├── speech.js         # khung sườn phát âm (chưa dùng, để dành)
│   └── app.js             # router + kết nối toàn bộ ứng dụng
├── google-apps-script/
│   └── Code.gs            # backend đọc Google Sheets, trả JSON
└── assets/icons/
```

---

## 2. Chuẩn bị Google Sheets

1. Tạo một Google Sheets mới.
2. Mỗi **Tab (Sheet)** = một bài học, ví dụ đặt tên `Lesson 01`, `Lesson 02`...
3. Hàng đầu tiên của mỗi tab là tiêu đề cột, **đúng thứ tự**:

   | STT | English | Vietnamese | Loại từ | CEFR Band |
   |-----|---------|------------|---------|-----------|
   | 1   | abandon | từ bỏ, bỏ rơi | verb | B2 |
   | 2   | ability | khả năng | noun | A2 |

4. Không để trống cột `English` ở bất kỳ hàng dữ liệu nào (hàng trống sẽ bị bỏ qua).
5. (Tuỳ chọn) Nếu có tab nào không phải bài học (ghi chú, cấu hình...), thêm
   tên tab đó vào mảng `IGNORED_SHEETS` ở đầu file `Code.gs`.

---

## 3. Deploy Google Apps Script

1. Trong Google Sheets vừa tạo, vào **Extensions → Apps Script**.
2. Xoá nội dung mặc định trong `Code.gs`, dán toàn bộ nội dung file
   `google-apps-script/Code.gs` trong project này vào.
3. Bấm **Deploy → New deployment**.
4. Chọn loại **Web app**.
5. Cấu hình:
   - **Execute as**: Me (tài khoản của bạn)
   - **Who has access**: Anyone (để website công khai gọi được API)
6. Bấm **Deploy**, cấp quyền truy cập Google Sheets khi được hỏi.
7. Copy **Web app URL** dạng:
   `https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec`
8. Kiểm tra nhanh bằng cách dán URL đó (thêm `?action=lessons`) vào trình
   duyệt — nếu thấy JSON trả về danh sách bài học là đã thành công.

Mỗi khi bạn sửa `Code.gs`, cần **Deploy → Manage deployments → chỉnh sửa →
Deploy lại** (hoặc tạo version mới) thì thay đổi mới có hiệu lực.

---

## 4. Cấu hình website

Mở file `js/config.js`, thay giá trị `API_URL`:

```javascript
const APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec",
  CACHE_TTL_MS: 5 * 60 * 1000,
  USE_DEMO_DATA_WHEN_UNCONFIGURED: true,
};
```

Nếu chưa cấu hình `API_URL`, website vẫn chạy được với **dữ liệu mẫu** (3
bài học demo trong `js/sheets.js`) để bạn xem trước giao diện.

---

## 5. Chạy thử ở máy local

Vì trình duyệt chặn `fetch()` khi mở file `index.html` trực tiếp
(`file://...`), hãy chạy qua một local server đơn giản, ví dụ:

```bash
# Python 3
python3 -m http.server 8080

# hoặc Node.js
npx serve .
```

Sau đó mở `http://localhost:8080`.

---

## 6. Deploy lên Vercel

1. Cài Vercel CLI: `npm i -g vercel` (hoặc dùng Vercel Dashboard).
2. Trong thư mục `english-learning/`, chạy:
   ```bash
   vercel
   ```
3. Chọn thiết lập mặc định (project này là static site, không cần build step).
4. Sau khi deploy xong, Vercel sẽ cấp một URL dạng `https://your-project.vercel.app`.

Hoặc dùng Vercel Dashboard: **New Project → Import** thư mục/repo này →
Framework Preset chọn **Other** (Static) → Deploy.

---

## 7. Deploy lên GitHub Pages

1. Tạo một repository mới trên GitHub, push toàn bộ thư mục `english-learning/`
   (bao gồm `index.html`, `style.css`, `js/`) lên nhánh `main`.
2. Vào **Settings → Pages**.
3. Ở mục **Source**, chọn nhánh `main` và thư mục `/ (root)`.
4. Bấm **Save**. Sau vài phút, GitHub sẽ cấp URL dạng:
   `https://<username>.github.io/<repo-name>/`

---

## 8. Ghi chú kỹ thuật

- Toàn bộ logic gọi Google Sheets nằm trong `js/sheets.js` — không có nơi
  nào khác trong app gọi `fetch()` tới Apps Script trực tiếp.
- Tiến độ học tập (từ đã nhớ, yêu thích, điểm quiz, streak, huy hiệu) lưu ở
  LocalStorage qua `js/progress.js`. Muốn chuyển sang lưu trên Google Sheets
  sau này, chỉ cần viết lại phần đọc/ghi bên trong module đó.
- Không có API key bí mật nào được đặt trong frontend. Apps Script Web App
  triển khai ở chế độ "Anyone" chỉ cho phép đọc dữ liệu công khai bạn đã
  chia sẻ, không lộ tài khoản Google của bạn.
- App tôn trọng cài đặt "prefers-reduced-motion" của hệ điều hành.

# 📊 ZENTUS Dev Sync Report — 2026-05-04

> Báo cáo tự động từ scheduled task `trungkien-dev-sync`

---

## ⚠️ Lưu ý quan trọng

**Không tìm thấy file `task.md` và `implementation_plan.md`** trong thư mục dự án.
Báo cáo này được tổng hợp từ git log, source code thực tế, và `spec.md` + `CLAUDE.md`.

---

## ✅ Tóm tắt những gì đã hoàn thành

### Phase 6 — LLM Chat Proxy (HOÀN THÀNH — chưa cập nhật CLAUDE.md)

CLAUDE.md vẫn đánh dấu Phase 6 là "🔲 Pending", nhưng thực tế đã xong hoàn toàn:

- Backend `POST /chat/message` — AI tutor gợi ý bài, từ chối cho đáp án trực tiếp
- Hỗ trợ dual LLM: DeepSeek (primary) → Anthropic Claude Haiku (fallback)
- Tích hợp vào `AssignmentDetail.jsx` — học sinh có thể chat trong lúc làm bài
- System prompt bằng tiếng Việt, capping history 10 lượt để giảm chi phí

### Các feature vượt spec ban đầu (thêm vào trong Phase 5–6)

| Feature | Trạng thái |
|---|---|
| Bài toán trắc nghiệm (multiple_choice, true_false) | ✅ Done |
| Bài tự luận (essay) + AI chấm riêng | ✅ Done |
| AI sinh bài toán tự động (`POST /problems/generate`) | ✅ Done |
| Auto token refresh (refresh 2 phút trước khi hết hạn) | ✅ Done |
| Rebranding sang ZENTUS | ✅ Done |

---

## 🚧 Phase 7 — Exam Management (ĐANG TRIỂN KHAI, còn thiếu)

Phase 7 được xác định từ comment trong `migrations/004_create_exams_table.sql`.

### Đã hoàn thành trong Phase 7

**Backend:**
- ✅ Migration `004_create_exams_table.sql` — tạo bảng `exams` + `exam_problems` với RLS đầy đủ
- ✅ Migration `005_update_assignments_for_exams.sql` — `assignments` hỗ trợ `exam_id` (nullable), thêm CHECK constraint
- ✅ `app/schemas/exams.py` — Pydantic schemas (ExamCreate, Exam, ExamList, ExamProblem)
- ✅ `app/api/endpoints/exams.py` — GET list, GET detail, POST create, DELETE
- ✅ `app/schemas/assignments.py` — cập nhật validator: bắt buộc có `problem_id` HOẶC `exam_id`
- ✅ `app/api/endpoints/assignments.py` — enrichment thêm `exam_title`, hỗ trợ tạo assignment từ exam

**Frontend:**
- ✅ `pages/Exams.jsx` — trang danh sách đề thi (list + delete)
- ✅ `pages/CreateExam.jsx` — tạo đề thi mới (chọn bài từ kho, đặt tên/mô tả/thời gian)
- ✅ `services/api.js` — `getExams`, `getExam`, `createExam`, `deleteExam`
- ✅ Route `/exams` và `/exams/create` trong `App.jsx`
- ✅ Dashboard có link đến `/exams`

### ❌ Còn thiếu trong Phase 7

**1. Không có trang ExamDetail (`/exams/:examId`)**
Hiện chỉ có list và tạo mới. Không thể xem chi tiết đề thi (danh sách câu hỏi, chỉnh sửa).

**2. Không có "Giao đề thi" trên UI**
Backend `POST /assignments` đã hỗ trợ `exam_id`, nhưng **không có modal/nút "Giao đề thi"** trên trang `/exams`. Học sinh chưa thể nhận assignment từ exam.

**3. Backend thiếu `PUT /exams/{id}`**
`exams.py` không có endpoint cập nhật exam (chỉnh sửa tiêu đề, bài toán). Chỉ có GET, POST, DELETE.

**4. `AssignmentDetail.jsx` chưa xử lý exam assignment**
Khi học sinh được giao một exam (không phải bài đơn lẻ), trang AssignmentDetail không biết cách hiển thị danh sách các câu hỏi trong exam để làm lần lượt.

**5. Không có submission flow cho exam**
Một exam gồm nhiều bài — hiện chưa có logic nộp bài cho từng câu trong đề thi và tổng hợp điểm.

---

## 🔴 Cảnh báo

### 1. CLAUDE.md bị lỗi thời nghiêm trọng
Cần cập nhật ngay:
- Phase 6: đổi từ `🔲 Pending` → `✅ Complete`
- Thêm Phase 7 vào danh sách với trạng thái hiện tại

### 2. Migration 004 + 005 chưa chắc đã chạy trên production
File SQL đã tạo nhưng không có bằng chứng đã apply vào Supabase. Nếu chưa chạy, toàn bộ tính năng Exams sẽ lỗi 500 trên production. **Cần kiểm tra ngay trên Supabase Dashboard xem bảng `exams` và `exam_problems` đã tồn tại chưa.**

### 3. CORS để `allow_origins=["*"]` trong production
`main.py` đang dùng wildcard CORS. Theo `spec.md`, yêu cầu chỉ cho phép frontend domain. Đây là lỗ hổng bảo mật cần sửa sau khi Phase 7 ổn định.

### 4. `llm_usage` table chưa được implement
`spec.md` yêu cầu log mọi LLM call vào bảng `llm_usage` để theo dõi chi phí. Hiện tại chưa có bảng này và code không log gì cả.

---

## 📋 Các bước cần làm tiếp theo (theo thứ tự ưu tiên)

### Ưu tiên cao — hoàn thiện Phase 7

1. **Kiểm tra migration trên Supabase production**
   - Vào Supabase Console → Table Editor → kiểm tra bảng `exams` và `exam_problems`
   - Nếu chưa có, chạy file `004_create_exams_table.sql` và `005_update_assignments_for_exams.sql`

2. **Tạo trang ExamDetail (`/exams/:examId`)**
   - Hiển thị danh sách bài toán trong đề thi
   - Nút "Giao đề thi cho học sinh" (modal chọn học sinh)

3. **Thêm modal "Giao đề thi" trong `Exams.jsx`**
   - Tương tự modal "Giao bài" hiện có trong `Assignments.jsx`
   - Gọi `createAssignment` với `exam_id`

4. **Xử lý exam assignment trong `AssignmentDetail.jsx`**
   - Nếu assignment có `exam_id`: fetch exam detail → hiển thị từng câu hỏi tuần tự
   - Submit từng câu, tổng hợp điểm cuối

5. **Thêm `PUT /exams/{id}` vào backend**
   - Cho phép giáo viên chỉnh sửa tiêu đề, mô tả, danh sách bài

### Ưu tiên trung bình

6. **Cập nhật `CLAUDE.md`** — đánh dấu Phase 6 complete, thêm Phase 7
7. **Sửa CORS** trong `main.py` — chỉ cho phép `https://trungkien-algorithm-ejqs.vercel.app`
8. **Implement `llm_usage` logging** — tạo bảng, log mỗi LLM call

---

*Báo cáo tự động — không cần phản hồi. Ngày tạo: 2026-05-04*

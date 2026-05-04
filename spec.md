# ZENTUS - Project Specification & Roadmap

## 1. Trạng thái hiện tại
- **Backend:** FastAPI + Supabase hoàn thiện các module chính (Auth, Students, Problems, Exams, Assignments, Chat AI).
- **Frontend:** React + Tailwind CSS (Vibe Premium/Glassmorphism).
- **AI Integration:** Claude 3.5 Sonnet & Haiku (Analyze PDF/Image, Chat Tutor, Grading).

## 2. Lịch sử hoàn thành (Mới nhất)
- ✅ **Phase 7 (Stage 2):** AI Exam Analyzer - Trích xuất đề từ PDF (pypdf) & Ảnh (Claude Vision).
- ✅ **Phase 6:** LLM Proxy & Quota - Giới hạn 20 lượt chat/ngày cho học sinh.
- ✅ **UI/UX:** Dashboard mới với thống kê trực quan và progress bar.

## 3. Kế hoạch tiếp theo (Ưu tiên cao)

### Giai đoạn: Nhân bản & Tạo biến thể đề thi (Exam Cloning & AI Variants)
- **Mục tiêu:** Giúp giáo viên tạo ra nhiều bộ đề tương tự nhau để chống gian lận hoặc dùng cho các lớp khác nhau.
- **Tính năng cụ thể:**
    1. **Clone (Sao chép y hệt):** Tạo bản sao đề thi và tất cả câu hỏi liên quan trong 1 click.
    2. **AI Mix (Tạo biến thể):** AI sẽ đọc đề thi gốc, giữ nguyên cấu trúc (số lượng câu, dạng bài, độ khó) nhưng thay đổi nội dung chi tiết (ví dụ: đổi số trong bài toán, đổi tên nhân vật trong bài văn).
    3. **UI Review:** Giao diện so sánh 2 bộ đề trước khi lưu.

### Giai đoạn: Quản lý Lớp học (Classrooms)
- **Mục tiêu:** Giao bài theo nhóm.
- **Tính năng:** Tạo lớp học -> Thêm học sinh vào lớp -> Giao bài cho cả lớp.

### Giai đoạn: Xuất bản (Export & Printing)
- **Mục tiêu:** Hỗ trợ thi offline.
- **Tính năng:** Xuất đề thi ra PDF định dạng đẹp, có mã QR để học sinh quét nộp bài bằng điện thoại.

---
*Cập nhật lần cuối: 2026-05-04*

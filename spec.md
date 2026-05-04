# ZENTUS — Technical Specification

**Cập nhật:** 2026-05-04  
**Stack:** FastAPI + Supabase + React + Railway + Vercel

---

## Quick Links

| Dịch vụ | URL |
|---|---|
| Frontend | https://trungkien-algorithm-ejqs.vercel.app |
| Backend API Docs | https://trungkien-algorithm-production.up.railway.app/docs |
| Supabase | https://supabase.com/dashboard/project/zabvdgnucfanvbjjgnic |
| Railway | https://railway.app |
| Vercel | https://vercel.com |

---

## Overview

Nền tảng đào tạo toán học cho giáo viên và học sinh Việt Nam. Giáo viên tạo/giao bài tập và đề thi, học sinh nộp bài, AI chấm điểm tự động.

---

## Architecture Constraints

**MUST USE:**
- Backend: Python FastAPI (NOT Node.js, NOT Go)
- Frontend: Vite + React + TailwindCSS (NOT Next.js)
- Database: Postgres via Supabase (NOT self-hosted, NOT SQLite in production)
- Auth: Supabase Auth (NOT custom JWT, NOT OAuth from scratch)
- Deployment: Railway (backend) + Vercel (frontend)

**MUST NOT:**
- No Kubernetes, Docker Swarm, or microservices
- No Redis/MongoDB/NoSQL
- No WebSocket/real-time features yet
- No custom email server (use Supabase email)

---

## Trạng thái hiện tại (Production)

| Phase | Tính năng | Trạng thái |
|---|---|---|
| 1 | Auth (login / register / me) | ✅ Done |
| 2 | Student Management | ✅ Done |
| 3 | Problem Management (CRUD + AI Generate + Bulk) | ✅ Done |
| 4 | Assignment Flow (giao bài đơn lẻ) | ✅ Done |
| 5 | Submission & AI Grading | ✅ Done |
| 7-S1 | Exam Management (CRUD Đề thi) | ✅ Done |
| 7-S2 | AI Exam Analyzer (PDF/Ảnh → câu hỏi) | ✅ Done |
| 6 | LLM Proxy (chat widget + quota) | 🔲 Pending |
| 7-S3 | Exam Detail + Giao đề thi | 🔲 Pending |
| 7-S4 | Dashboard thống kê | 🔲 Pending |

---

## Database Schema (Current)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE students_teachers (
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, student_id)
);

CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  category TEXT NOT NULL,
  problem_type TEXT DEFAULT 'algorithm', -- algorithm | multiple_choice | true_false | trivia | essay
  choices JSONB,        -- Cho dạng trắc nghiệm
  correct_answer TEXT,
  solution TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER DEFAULT 60, -- phút
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exam_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES users(id),
  student_id UUID REFERENCES users(id),
  problem_id UUID REFERENCES problems(id), -- NULL nếu giao theo đề thi
  exam_id UUID REFERENCES exams(id),       -- NULL nếu giao bài đơn lẻ
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  text_content TEXT,
  image_urls TEXT[],
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  feedback_json JSONB,
  graded_at TIMESTAMPTZ DEFAULT NOW()
);

-- [PENDING] Phase 6: LLM Usage Tracking
CREATE TABLE llm_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 0,
  UNIQUE (student_id, date)
);
```

---

## API Endpoints

### ✅ Phase 1–5 & 7-S1/S2 (Đã hoàn thành)

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | /auth/register | Đăng ký tài khoản |
| POST | /auth/login | Đăng nhập |
| GET | /auth/me | Xác thực token |
| GET | /students/ | Danh sách học sinh |
| POST | /students/ | Thêm học sinh |
| DELETE | /students/{id} | Xóa học sinh |
| GET | /problems/ | Danh sách bài toán |
| POST | /problems/ | Tạo bài toán |
| PUT | /problems/{id} | Sửa bài toán |
| DELETE | /problems/{id} | Xóa bài toán |
| POST | /problems/generate | AI tạo 1 bài toán |
| POST | /problems/generate-bulk | AI tạo hàng loạt |
| GET | /exams/ | Danh sách đề thi |
| POST | /exams/ | Tạo đề thi |
| GET | /exams/{id} | Chi tiết đề thi |
| DELETE | /exams/{id} | Xóa đề thi |
| POST | /exams/analyze | AI phân tích PDF/Ảnh → câu hỏi |
| GET | /assignments/ | Danh sách bài tập |
| POST | /assignments/ | Giao bài (problem_id hoặc exam_id) |
| DELETE | /assignments/{id} | Hủy bài tập |
| POST | /submissions/ | Nộp bài |
| POST | /submissions/{id}/grade | AI chấm điểm |
| GET | /submissions/{id} | Xem bài nộp |
| POST | /chat/message | Chat AI hỗ trợ làm bài |

### 🔲 Phase 6: LLM Proxy (Cần xây dựng)

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | /proxy/chat | Chat với AI, forward sang Claude |
| GET | /proxy/quota | Xem số lượt còn lại hôm nay |

**Quy tắc:** Giới hạn **20 lượt/ngày/học sinh**. Middleware kiểm tra quota trước khi gọi Claude.

### 🔲 Phase 7-S3: Exam Detail & Assignment Flow (Cần xây dựng)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | /exams/{id} | Chi tiết đề + danh sách câu hỏi |
| POST | /assignments/ | Giao đề thi (exam_id) cho học sinh |

---

## Việc cần làm (Thứ tự ưu tiên)

### 🔥 Tuần này

#### 1. Kiểm thử AI Exam Analyzer (đã deploy)
- [ ] Upload PDF đề thi digital → kiểm tra log Railway
- [ ] Upload ảnh scan → xác nhận fallback Claude Vision hoạt động
- [ ] Kiểm tra đề thi được tạo đúng câu hỏi trong DB

#### 2. Trang ExamDetail + Giao đề thi
- [ ] **Frontend:** Tạo `ExamDetail.jsx` tại `/exams/:id`
  - Hiển thị danh sách câu hỏi đầy đủ trong đề
  - Nút "Giao đề thi này" → mở modal chọn học sinh
- [ ] **Frontend:** Modal giao đề thi trong `ExamDetail.jsx`
  - Dropdown chọn học sinh (từ /students/)
  - Date picker cho hạn nộp
  - Gọi `createAssignment({ exam_id, student_id, due_date })`
- [ ] **Backend:** Endpoint `/exams/{id}` đã sẵn sàng (kiểm tra lại response schema)

### 📅 Tuần sau

#### 3. Phase 6 – LLM Proxy (Chat widget cho học sinh)

**Backend:**
- [ ] Migration: Tạo bảng `llm_usage`
- [ ] Middleware `check_quota`: Đếm số lượt dùng AI trong ngày
- [ ] Endpoint `POST /proxy/chat`: Nhận message → gọi Claude → trả về
- [ ] Endpoint `GET /proxy/quota`: Trả về `{ used: 5, limit: 20, remaining: 15 }`

**Frontend:**
- [ ] Chat widget trong `AssignmentDetail.jsx` (đã có sườn `/chat`)
- [ ] Hiển thị "Còn X lượt hỏi AI hôm nay"
- [ ] Disable input và hiện thông báo khi hết quota

#### 4. Dashboard cải thiện

**Giáo viên:**
- [ ] Số bài tập đã giao / chưa nộp / đã chấm
- [ ] Số đề thi trong kho

**Học sinh:**
- [ ] Số bài tập đang chờ nộp
- [ ] Điểm trung bình gần nhất
- [ ] Gọi `/assignments` và `/submissions` để lấy dữ liệu thống kê

### 🧹 Sau đó – Dọn nợ kỹ thuật

| Vấn đề | Mô tả | Ưu tiên |
|---|---|---|
| RLS trên `public.users` | Hiện đang tắt, cần bật và viết policy | Trung bình |
| Error handling đồng nhất | Một số endpoint trả lỗi khác format | Thấp |
| Pagination ở frontend | Problems/Exams chưa có UI phân trang | Thấp |
| Test coverage | Chưa có unit test nào | Thấp |

---

## Security Requirements

1. **Auth**: Mọi endpoint trừ `/auth/*` đều yêu cầu JWT hợp lệ trong header `Authorization`
2. **Authorization**: Giáo viên chỉ thấy học sinh của mình; học sinh chỉ thấy bài tập của mình
3. **Input validation**: Validate tất cả đầu vào (email, file size, SQL injection)
4. **Secrets**: API keys trong biến môi trường, không bao giờ trong code
5. **CORS**: `allow_origins=["*"]`, `allow_credentials=False` (dùng Bearer token thay Cookie)
6. **LLM Quota**: Giới hạn 20 lượt/ngày/học sinh để kiểm soát chi phí

---

## LLM Integration

Hỗ trợ cả Anthropic Claude và DeepSeek:
- Backend đọc `ANTHROPIC_API_KEY` và `DEEPSEEK_API_KEY` từ biến môi trường
- **Mọi lệnh gọi LLM đều qua Backend. Frontend KHÔNG BAO GIỜ thấy API key.**
- Log mỗi lần gọi: `user_id`, `provider`, `model`, `input_tokens`, `output_tokens`
- Lưu log vào bảng `llm_usage` để theo dõi chi phí

---

## UI/UX Requirements

- Ngôn ngữ Tiếng Việt xuyên suốt
- LaTeX rendering với KaTeX
- Responsive mobile (Tailwind responsive classes)
- Loading states cho mọi thao tác async
- Thông báo lỗi bằng Tiếng Việt
- Design: Glassmorphism (`bg-white/60 backdrop-blur-xl`)

---

## Development Workflow

1. Dùng Supabase SDK (`@supabase/supabase-js`) cho DB queries, không dùng raw SQL
2. Test từng endpoint với `/docs` (Swagger UI) trước khi làm frontend
3. Commit sau mỗi tính năng hoàn chỉnh
4. Dùng `git_push_zentus_rebrand.bat` để push lên GitHub
5. Railway và Vercel tự động deploy khi có commit mới trên `main`

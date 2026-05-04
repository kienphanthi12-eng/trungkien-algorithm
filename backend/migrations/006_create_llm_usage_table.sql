-- Migration: 006_create_llm_usage_table.sql
-- Tạo bảng theo dõi số lượt chat AI mỗi ngày theo học sinh

CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (student_id, date)
);

-- Index để truy vấn nhanh theo student_id + date
CREATE INDEX IF NOT EXISTS idx_llm_usage_student_date ON llm_usage (student_id, date);

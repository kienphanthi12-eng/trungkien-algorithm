-- Seed data for subjects
-- First, clear existing seeded data to prevent duplicates if run multiple times
DELETE FROM public.subjects WHERE name IN ('Đại số', 'Hình học', 'Xác suất - Thống kê') AND grade = 9;

INSERT INTO public.subjects (name, grade, icon, order_index) VALUES
('Đại số', 9, '📐', 1),
('Hình học', 9, '📏', 2),
('Xác suất - Thống kê', 9, '🎲', 3);

-- Seed data for topics
INSERT INTO public.topics (subject_id, title, order_index)
SELECT id, 'Phương trình bậc hai', 1 FROM public.subjects WHERE name='Đại số' AND grade=9
UNION ALL
SELECT id, 'Hệ phương trình', 2 FROM public.subjects WHERE name='Đại số' AND grade=9
UNION ALL
SELECT id, 'Căn thức bậc hai', 3 FROM public.subjects WHERE name='Đại số' AND grade=9
UNION ALL
SELECT id, 'Đường tròn', 1 FROM public.subjects WHERE name='Hình học' AND grade=9
UNION ALL
SELECT id, 'Tứ giác nội tiếp', 2 FROM public.subjects WHERE name='Hình học' AND grade=9;

-- Seed data for lessons
INSERT INTO public.lessons (topic_id, title, objectives, order_index, theory_prompt)
SELECT id,
  'Giải phương trình bậc hai bằng công thức nghiệm',
  ARRAY['Nhớ công thức nghiệm', 'Tính delta', 'Tìm nghiệm x1 x2'],
  1,
  'Bạn là giáo viên toán lớp 9, đang dạy bài "Giải phương trình bậc hai bằng công thức nghiệm".'
FROM public.topics WHERE title='Phương trình bậc hai';

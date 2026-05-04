-- Thêm cột figure_json để lưu trữ cấu trúc hình vẽ thông minh
ALTER TABLE public.problems 
ADD COLUMN IF NOT EXISTS figure_json JSONB DEFAULT NULL;

-- Comment giải thích
COMMENT ON COLUMN public.problems.figure_json IS 'Lưu trữ cấu trúc hình vẽ (điểm, đường, hình phẳng, 3D templates) dưới dạng JSON để render SVG';

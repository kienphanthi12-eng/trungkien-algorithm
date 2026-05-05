-- Migration 002: Thêm cột figure_image để lưu hình vẽ Matplotlib (PNG base64)
-- Chạy trong Supabase SQL Editor

ALTER TABLE public.problems
ADD COLUMN IF NOT EXISTS figure_image TEXT DEFAULT NULL;

COMMENT ON COLUMN public.problems.figure_image IS
  'Hình vẽ toán học dạng PNG base64, sinh tự động từ Matplotlib qua pipeline AI';

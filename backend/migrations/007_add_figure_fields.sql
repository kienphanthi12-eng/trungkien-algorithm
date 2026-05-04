-- Phase 1: Add figure fields to problems table
ALTER TABLE public.problems
  ADD COLUMN IF NOT EXISTS figure_json JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS figure_svg  TEXT   DEFAULT NULL;

COMMENT ON COLUMN public.problems.figure_json IS 'Structured geometry JSON (points, segments, circles, etc.) used to regenerate SVG and create variants';
COMMENT ON COLUMN public.problems.figure_svg  IS 'Cached SVG string rendered from figure_json. Re-generated when figure_json changes.';

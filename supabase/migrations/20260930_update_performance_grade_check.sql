-- Migration: Update participations performance_grade check constraint to support A+ (7 points)
-- Run this in your Supabase SQL Editor:

ALTER TABLE participations 
DROP CONSTRAINT IF EXISTS participations_performance_grade_check;

ALTER TABLE participations 
ADD CONSTRAINT participations_performance_grade_check 
CHECK (performance_grade IN ('A+', 'A', 'B', 'C', 'NONE') OR performance_grade IS NULL);

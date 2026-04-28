-- Migration: Add missing columns from migration.sql that are not in the current schema
-- Generated on 2026-04-29

-- Add source_kind column to quizzes table
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'ai';

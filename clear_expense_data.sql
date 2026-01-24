-- ============================================================
-- CLEAR ALL EXPENSE DATA - START FRESH FROM 0
-- ============================================================
-- Run this in Supabase SQL Editor to delete all expense items
-- and payment history to start tracking from scratch
-- ============================================================

-- 1. Delete all payment history records
DELETE FROM payment_history;

-- 2. Delete all expense items (keeps other items like videos, notes, etc.)
DELETE FROM items WHERE type = 'expense';

-- ============================================================
-- ✅ COMPLETE!
-- ============================================================
-- All expense data has been cleared.
-- You can now start fresh with 0 expenses and 0 income.
-- 
-- Your stats will show:
-- - Total Expenses: ₹0.00
-- - Total Income: ₹0.00
-- - Net Balance: Your current wallet balance
-- - Pending Items: 0
-- ============================================================

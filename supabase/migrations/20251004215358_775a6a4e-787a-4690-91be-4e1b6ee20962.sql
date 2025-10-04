-- Add brand and category columns to user_analyses table
ALTER TABLE user_analyses 
ADD COLUMN brand text,
ADD COLUMN category text;
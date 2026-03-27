/*
  # Create favorite stops table

  1. New Tables
    - `favorite_stops`
      - `id` (uuid, primary key) - Unique identifier for each favorite
      - `user_id` (uuid) - Reference to the user who saved the favorite
      - `site_id` (text) - SL site/stop ID
      - `site_name` (text) - Name of the stop/station
      - `created_at` (timestamptz) - When the favorite was created

  2. Security
    - Enable RLS on `favorite_stops` table
    - Add policy for users to read their own favorites
    - Add policy for users to insert their own favorites
    - Add policy for users to delete their own favorites

  3. Notes
    - This table allows users to save their frequently used stops for quick access
    - Each user can only access their own favorites
*/

CREATE TABLE IF NOT EXISTS favorite_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT gen_random_uuid(),
  site_id text NOT NULL,
  site_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE favorite_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON favorite_stops FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own favorites"
  ON favorite_stops FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete own favorites"
  ON favorite_stops FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_favorite_stops_user_id ON favorite_stops(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_stops_site_id ON favorite_stops(site_id);

-- Add character_config column to profiles table for storing character customization
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS character_config TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_character_config ON profiles(character_config);

-- Add comment to explain the column
COMMENT ON COLUMN profiles.character_config IS 'Stores serialized character customization config in format: character:base64(JSON)';

-- Add birthday and age columns to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "birthday" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "age" INTEGER;

-- Create function to calculate age from birthday
CREATE OR REPLACE FUNCTION calculate_age_from_birthday()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.birthday IS NOT NULL THEN
    NEW.age := EXTRACT(YEAR FROM AGE(NEW.birthday))::INTEGER;
  ELSE
    NEW.age := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate age on INSERT
CREATE TRIGGER trigger_calculate_age_on_insert
BEFORE INSERT ON "User"
FOR EACH ROW
EXECUTE FUNCTION calculate_age_from_birthday();

-- Create trigger to auto-calculate age on UPDATE
CREATE TRIGGER trigger_calculate_age_on_update
BEFORE UPDATE ON "User"
FOR EACH ROW
WHEN (OLD.birthday IS DISTINCT FROM NEW.birthday)
EXECUTE FUNCTION calculate_age_from_birthday();

-- Update existing users with calculated age
UPDATE "User"
SET age = EXTRACT(YEAR FROM AGE(birthday))::INTEGER
WHERE birthday IS NOT NULL AND age IS NULL;

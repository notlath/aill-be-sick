-- Recreate the age calculation trigger (fix for existing trigger that stopped working)

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_calculate_age_on_insert ON "User";
DROP TRIGGER IF EXISTS trigger_calculate_age_on_update ON "User";

-- Recreate function to calculate age from birthday
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

-- Recreate trigger to auto-calculate age on INSERT
CREATE TRIGGER trigger_calculate_age_on_insert
BEFORE INSERT ON "User"
FOR EACH ROW
EXECUTE FUNCTION calculate_age_from_birthday();

-- Recreate trigger to auto-calculate age on UPDATE
CREATE TRIGGER trigger_calculate_age_on_update
BEFORE UPDATE ON "User"
FOR EACH ROW
WHEN (OLD.birthday IS DISTINCT FROM NEW.birthday)
EXECUTE FUNCTION calculate_age_from_birthday();

-- Backfill existing users with birthday but no age or incorrect age
UPDATE "User"
SET age = EXTRACT(YEAR FROM AGE(birthday))::INTEGER
WHERE birthday IS NOT NULL;

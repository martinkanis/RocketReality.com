-- Historie cen se zapisuje triggerem, aby ji neobesel ani import ani primy SQL.
CREATE OR REPLACE FUNCTION record_price_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  became_active boolean := NEW.status = 'active'
    AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active');
  price_changed boolean := TG_OP = 'UPDATE' AND (
    NEW.price_amount IS DISTINCT FROM OLD.price_amount
    OR NEW.price_currency IS DISTINCT FROM OLD.price_currency
    OR NEW.price_unit IS DISTINCT FROM OLD.price_unit);
BEGIN
  IF became_active OR (price_changed AND NEW.status IN ('active', 'paused', 'pending_review')) THEN
    INSERT INTO price_history (id, listing_id, price_amount, price_currency, price_unit)
    VALUES (gen_random_uuid(), NEW.id, NEW.price_amount, NEW.price_currency, NEW.price_unit);
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER listings_price_history
AFTER INSERT OR UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION record_price_history();
--> statement-breakpoint
-- Naseptavac obci: trigram GIN pro fuzzy hledani podle nazvu.
CREATE INDEX municipalities_name_trgm ON municipalities USING gin (name gin_trgm_ops);

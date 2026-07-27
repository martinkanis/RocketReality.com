-- Drizzle generoval geometry(point) bez SRID a inserty ukladaly SRID 0 —
-- vynutime WGS-84 (4326), jinak ST_Intersects s bbox 4326 pada na mixed SRID.
ALTER TABLE listings
  ALTER COLUMN location_point TYPE geometry(Point, 4326)
  USING ST_SetSRID(location_point, 4326);
--> statement-breakpoint
ALTER TABLE municipalities
  ALTER COLUMN centroid TYPE geometry(Point, 4326)
  USING ST_SetSRID(centroid, 4326);
--> statement-breakpoint
ALTER TABLE agencies
  ALTER COLUMN gps TYPE geometry(Point, 4326)
  USING ST_SetSRID(gps, 4326);

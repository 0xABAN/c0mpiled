-- Trigram indexes make free-text search (`search_text ilike '%word%'`) fast. pg_trgm is a
-- trusted extension on RDS, so the database owner can enable it.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

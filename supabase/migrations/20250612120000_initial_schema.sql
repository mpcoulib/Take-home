-- Hospital Quality Matcher — Phase 1 data contract in Postgres (see backend/app/SCHEMA.md)

CREATE TABLE IF NOT EXISTS facilities (
  facility_id TEXT PRIMARY KEY CHECK (facility_id ~ '^\d{6}$'),
  name TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  ownership TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS facility_measures (
  facility_id TEXT NOT NULL REFERENCES facilities(facility_id) ON DELETE CASCADE,
  measure_id TEXT NOT NULL,
  score DOUBLE PRECISION,
  compared_to_national TEXT,
  footnote TEXT NOT NULL DEFAULT '',
  dataset_key TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (facility_id, measure_id),
  CONSTRAINT facility_measures_compared_check CHECK (
    compared_to_national IS NULL
    OR compared_to_national IN (
      'better', 'worse', 'no_different', 'not_available', 'too_few_cases'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_facility_measures_measure_id ON facility_measures(measure_id);
CREATE INDEX IF NOT EXISTS idx_facilities_state ON facilities(state);

-- CMS source modified timestamps (measures_store.meta.json)
CREATE TABLE IF NOT EXISTS store_meta (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security: public read; writes via service role / DATABASE_URL only
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_facilities" ON facilities FOR SELECT USING (true);
CREATE POLICY "public_read_facility_measures" ON facility_measures FOR SELECT USING (true);
CREATE POLICY "public_read_store_meta" ON store_meta FOR SELECT USING (true);

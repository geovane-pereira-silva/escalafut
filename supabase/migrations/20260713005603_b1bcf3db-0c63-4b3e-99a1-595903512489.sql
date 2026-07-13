
-- 1. peladas table
CREATE TABLE public.peladas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.peladas TO authenticated;
GRANT SELECT ON public.peladas TO anon;
GRANT ALL ON public.peladas TO service_role;

ALTER TABLE public.peladas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view peladas" ON public.peladas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert peladas" ON public.peladas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update peladas" ON public.peladas FOR UPDATE USING (true);

CREATE TRIGGER update_peladas_updated_at
  BEFORE UPDATE ON public.peladas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Seed AABB PIEAD
INSERT INTO public.peladas (name) VALUES ('AABB PIEAD');

-- 3. Drop old (coach_id, round_number) uniqueness BEFORE normalization so it doesn't collide
ALTER TABLE public.rounds DROP CONSTRAINT rounds_coach_id_round_number_key;

-- 4. Normalize coach_id (GEOVANE/Geovane -> geovane; Coach -> coach)
UPDATE public.players SET coach_id = LOWER(coach_id);
UPDATE public.rounds  SET coach_id = LOWER(coach_id);

-- 5. Add pelada_id columns (nullable first so we can backfill)
ALTER TABLE public.players ADD COLUMN pelada_id UUID REFERENCES public.peladas(id) ON DELETE CASCADE;
ALTER TABLE public.rounds  ADD COLUMN pelada_id UUID REFERENCES public.peladas(id) ON DELETE CASCADE;

-- 6. Assign every existing row to AABB PIEAD
UPDATE public.players
  SET pelada_id = (SELECT id FROM public.peladas WHERE name = 'AABB PIEAD');
UPDATE public.rounds
  SET pelada_id = (SELECT id FROM public.peladas WHERE name = 'AABB PIEAD');

-- 7. Enforce NOT NULL
ALTER TABLE public.players ALTER COLUMN pelada_id SET NOT NULL;
ALTER TABLE public.rounds  ALTER COLUMN pelada_id SET NOT NULL;

-- 8. Renumber rounds per pelada, chronologically (preserves performances via round_id)
WITH renum AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY pelada_id ORDER BY created_at) AS n
  FROM public.rounds
)
UPDATE public.rounds r
  SET round_number = renum.n
  FROM renum
  WHERE r.id = renum.id;

-- 9. New uniqueness: (pelada_id, round_number)
ALTER TABLE public.rounds
  ADD CONSTRAINT rounds_pelada_id_round_number_key UNIQUE (pelada_id, round_number);

-- 10. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_players_pelada ON public.players(pelada_id);
CREATE INDEX IF NOT EXISTS idx_rounds_pelada  ON public.rounds(pelada_id);


-- Rounds table
CREATE TABLE public.rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id TEXT NOT NULL,
  round_number INT NOT NULL,
  round_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'finalized')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (coach_id, round_number)
);

-- Player performance per round
CREATE TABLE public.player_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  scouts JSONB NOT NULL DEFAULT '{}'::jsonb,
  points_calculated FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (player_id, round_id)
);

-- RLS
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rounds" ON public.rounds FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rounds" ON public.rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rounds" ON public.rounds FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete rounds" ON public.rounds FOR DELETE USING (true);

CREATE POLICY "Anyone can view performance" ON public.player_performance FOR SELECT USING (true);
CREATE POLICY "Anyone can insert performance" ON public.player_performance FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update performance" ON public.player_performance FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete performance" ON public.player_performance FOR DELETE USING (true);

-- Realtime for performance updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_performance;

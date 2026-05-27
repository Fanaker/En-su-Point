ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_address text,
  ADD COLUMN IF NOT EXISTS home_district text,
  ADD COLUMN IF NOT EXISTS home_latitude double precision,
  ADD COLUMN IF NOT EXISTS home_longitude double precision;

ALTER TABLE public.saved_places
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Solo dueño edita su point" ON public.points;
CREATE POLICY "Dueño o admin edita point"
ON public.points
FOR UPDATE
USING ((auth.uid() = created_by) OR is_admin(auth.uid()))
WITH CHECK ((auth.uid() = created_by) OR is_admin(auth.uid()));

CREATE POLICY "Solo dueño actualiza guardado"
ON public.saved_places
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_places_user_favorite ON public.saved_places(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_profiles_home_location ON public.profiles(home_latitude, home_longitude);
CREATE UNIQUE INDEX IF NOT EXISTS ratings_point_user_unique
ON public.ratings(point_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS saved_places_point_user_unique
ON public.saved_places(point_id, user_id);
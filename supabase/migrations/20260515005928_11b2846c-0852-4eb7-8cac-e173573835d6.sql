DROP POLICY IF EXISTS "Solo dueño edita comentario" ON public.comments;
CREATE POLICY "Dueño o admin edita comentario"
ON public.comments
FOR UPDATE
USING ((auth.uid() = user_id) OR is_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Solo dueño edita su rating" ON public.ratings;
CREATE POLICY "Dueño o admin edita rating"
ON public.ratings
FOR UPDATE
USING ((auth.uid() = user_id) OR is_admin(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_admin(auth.uid()));
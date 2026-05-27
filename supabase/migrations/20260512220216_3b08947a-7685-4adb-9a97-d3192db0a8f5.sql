-- Add icon to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT;

UPDATE public.categories SET icon = CASE slug
  WHEN 'restaurante' THEN 'utensils'
  WHEN 'karaoke' THEN 'mic'
  WHEN 'hotel' THEN 'hotel'
  WHEN 'entretenimiento' THEN 'party-popper'
  WHEN 'cafe' THEN 'coffee'
  WHEN 'bar' THEN 'beer'
  WHEN 'rooftop' THEN 'building'
  WHEN 'comida-rapida' THEN 'pizza'
  WHEN 'centro-comercial' THEN 'shopping-bag'
  WHEN 'lugar-oculto' THEN 'sparkles'
  WHEN 'spot-de-fotos' THEN 'camera'
  ELSE 'map-pin'
END;

-- Profiles: xp + searchable
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(lower(username));
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(lower(display_name));

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  point_id UUID REFERENCES public.points(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve sus notificaciones" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Sistema/usuario inserta notificaciones" ON public.notifications FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Usuario actualiza sus notificaciones" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Usuario elimina sus notificaciones" ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notif_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON public.notifications(user_id) WHERE is_read = false;

-- ============ NOTIFICATION TRIGGERS ============
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner UUID;
BEGIN
  SELECT created_by INTO _owner FROM public.points WHERE id = NEW.point_id;
  IF _owner IS NOT NULL AND _owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, point_id, comment_id, message)
    VALUES (_owner, NEW.user_id, 'comment', NEW.point_id, NEW.id, 'Comentó tu point');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_comment ON public.comments;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

CREATE OR REPLACE FUNCTION public.notify_on_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner UUID;
BEGIN
  SELECT created_by INTO _owner FROM public.points WHERE id = NEW.point_id;
  IF _owner IS NOT NULL AND _owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, point_id, message)
    VALUES (_owner, NEW.user_id, 'rating', NEW.point_id, 'Valoró tu point con ' || NEW.stars || '★');
    -- XP a quien recibe valoración
    UPDATE public.profiles SET xp = xp + 5 WHERE id = _owner;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_rating ON public.ratings;
CREATE TRIGGER trg_notify_rating AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_rating();

CREATE OR REPLACE FUNCTION public.notify_on_reaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner UUID;
BEGIN
  IF NEW.point_id IS NOT NULL THEN
    SELECT created_by INTO _owner FROM public.points WHERE id = NEW.point_id;
  ELSIF NEW.comment_id IS NOT NULL THEN
    SELECT user_id INTO _owner FROM public.comments WHERE id = NEW.comment_id;
  END IF;
  IF _owner IS NOT NULL AND _owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, point_id, comment_id, message)
    VALUES (_owner, NEW.user_id, 'reaction', NEW.point_id, NEW.comment_id, 'Reaccionó con ' || NEW.emoji);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_reaction ON public.reactions;
CREATE TRIGGER trg_notify_reaction AFTER INSERT ON public.reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reaction();

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, message)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', 'Empezó a seguirte');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_notify_follow ON public.followers;
CREATE TRIGGER trg_notify_follow AFTER INSERT ON public.followers
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- XP por crear point / comentario
CREATE OR REPLACE FUNCTION public.xp_on_point()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    UPDATE public.profiles SET xp = xp + 20 WHERE id = NEW.created_by;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_xp_point ON public.points;
CREATE TRIGGER trg_xp_point AFTER INSERT ON public.points
  FOR EACH ROW EXECUTE FUNCTION public.xp_on_point();

CREATE OR REPLACE FUNCTION public.xp_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET xp = xp + 3 WHERE id = NEW.user_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_xp_comment ON public.comments;
CREATE TRIGGER trg_xp_comment AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.xp_on_comment();

-- Realtime para notificaciones
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
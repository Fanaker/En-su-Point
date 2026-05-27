
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'moderator', 'user');
CREATE TYPE public.saved_list AS ENUM ('quiero_ir', 'visitado');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  district TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfiles visibles para todos" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuarios pueden actualizar su perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuarios pueden insertar su perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin', 'moderator')
  )
$$;

CREATE POLICY "Roles visibles para todos" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Solo super admin gestiona roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ============ NEW USER TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  IF NEW.email = 'fabiansebastim@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorías visibles para todos" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados crean categorías" ON public.categories FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND length(name) <= 20);
CREATE POLICY "Solo admins editan categorías" ON public.categories FOR UPDATE
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Solo admins borran categorías" ON public.categories FOR DELETE
  USING (public.is_admin(auth.uid()));

INSERT INTO public.categories (name, slug, is_default) VALUES
  ('Restaurante', 'restaurante', true),
  ('Karaoke', 'karaoke', true),
  ('Hotel', 'hotel', true),
  ('Entretenimiento', 'entretenimiento', true),
  ('Café', 'cafe', true),
  ('Bar', 'bar', true),
  ('Rooftop', 'rooftop', true),
  ('Comida rápida', 'comida-rapida', true),
  ('Centro comercial', 'centro-comercial', true),
  ('Lugar oculto', 'lugar-oculto', true),
  ('Spot de Fotos', 'spot-de-fotos', true),
  ('Otro', 'otro', true);

-- ============ POINTS ============
CREATE TABLE public.points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  district TEXT NOT NULL,
  address TEXT NOT NULL,
  reference TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Points visibles para todos" ON public.points FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados crean points" ON public.points FOR INSERT
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Solo dueño edita su point" ON public.points FOR UPDATE
  USING (auth.uid() = created_by);
CREATE POLICY "Dueño o admin elimina point" ON public.points FOR DELETE
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE INDEX idx_points_category ON public.points(category_id);
CREATE INDEX idx_points_district ON public.points(district);
CREATE INDEX idx_points_created_by ON public.points(created_by);

-- ============ COMMENTS ============
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id UUID NOT NULL REFERENCES public.points(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) <= 1000),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comentarios visibles para todos" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados comentan" ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Solo dueño edita comentario" ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Dueño o admin elimina comentario" ON public.comments FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ============ RATINGS ============
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id UUID NOT NULL REFERENCES public.points(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (point_id, user_id)
);
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ratings visibles para todos" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados valoran" ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Solo dueño edita su rating" ON public.ratings FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Dueño o admin elimina rating" ON public.ratings FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Trigger para recalcular promedio
CREATE OR REPLACE FUNCTION public.recalc_point_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid UUID;
BEGIN
  _pid := COALESCE(NEW.point_id, OLD.point_id);
  UPDATE public.points SET
    avg_rating = COALESCE((SELECT ROUND(AVG(stars)::numeric, 2) FROM public.ratings WHERE point_id = _pid), 0),
    total_reviews = (SELECT COUNT(*) FROM public.ratings WHERE point_id = _pid)
  WHERE id = _pid;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.recalc_point_rating();

-- ============ SAVED PLACES ============
CREATE TABLE public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  point_id UUID NOT NULL REFERENCES public.points(id) ON DELETE CASCADE,
  list_type saved_list NOT NULL DEFAULT 'quiero_ir',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, point_id, list_type)
);
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo dueño ve sus guardados" ON public.saved_places FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Solo dueño guarda" ON public.saved_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Solo dueño elimina guardado" ON public.saved_places FOR DELETE
  USING (auth.uid() = user_id);

-- ============ REACTIONS ============
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  point_id UUID REFERENCES public.points(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((point_id IS NOT NULL) <> (comment_id IS NOT NULL)),
  UNIQUE (user_id, point_id, comment_id, emoji)
);
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reacciones visibles para todos" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados reaccionan" ON public.reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Solo dueño elimina su reacción" ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============ FOLLOWERS ============
CREATE TABLE public.followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seguidores visibles para todos" ON public.followers FOR SELECT USING (true);
CREATE POLICY "Solo dueño sigue" ON public.followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Solo dueño deja de seguir" ON public.followers FOR DELETE
  USING (auth.uid() = follower_id);

-- ============ REPORTS ============
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  point_id UUID REFERENCES public.points(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(reason) <= 500),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((point_id IS NOT NULL) OR (comment_id IS NOT NULL))
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios crean reportes" ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporter o admin ven reporte" ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id OR public.is_admin(auth.uid()));
CREATE POLICY "Solo admin actualiza reporte" ON public.reports FOR UPDATE
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Solo admin elimina reporte" ON public.reports FOR DELETE
  USING (public.is_admin(auth.uid()));

-- ============ updated_at trigger helper ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_points_updated BEFORE UPDATE ON public.points FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_comments_updated BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ratings_updated BEFORE UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('points', 'points', true);

CREATE POLICY "Imágenes de points públicas" ON storage.objects FOR SELECT
  USING (bucket_id = 'points');
CREATE POLICY "Usuarios autenticados suben imágenes" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'points' AND auth.uid() IS NOT NULL);
CREATE POLICY "Dueño elimina su imagen" ON storage.objects FOR DELETE
  USING (bucket_id = 'points' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Dueño actualiza su imagen" ON storage.objects FOR UPDATE
  USING (bucket_id = 'points' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ AVATARS BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
CREATE POLICY "Avatares públicos" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Usuarios suben su avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Usuarios actualizan su avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Usuarios eliminan su avatar" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

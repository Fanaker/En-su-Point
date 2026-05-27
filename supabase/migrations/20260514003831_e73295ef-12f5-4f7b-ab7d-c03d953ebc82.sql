INSERT INTO public.categories (name, slug, icon, is_default) VALUES
('Pollería', 'polleria', 'utensils', true),
('Buffet', 'buffet', 'utensils', true)
ON CONFLICT DO NOTHING;
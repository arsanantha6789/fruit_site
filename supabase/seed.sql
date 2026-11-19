-- Demo catalogue for local development / first launch.
-- Safe to re-run: existing slugs are skipped. Prices in paise.
-- Product photos are added afterwards from Dashboard → Products.

insert into public.categories (name, slug, description, sort_order) values
  ('Fruits', 'fruits', 'Seasonal fruits, ripened naturally and picked at their sweetest.', 1),
  ('Vegetables', 'vegetables', 'Everyday kitchen staples, fresh from nearby farms.', 2),
  ('Leafy Greens & Herbs', 'leafy-greens-herbs', 'Tender greens and fragrant herbs, bunched the same morning.', 3),
  ('Exotics', 'exotics', 'Avocados, broccoli and other specialty produce.', 4)
on conflict (slug) do nothing;

with p(cat, name, slug, unit, origin, featured, descr) as (values
  ('fruits', 'Robusta Bananas', 'robusta-bananas', 'dozen', 'Jalgaon, Maharashtra', true, 'Creamy, naturally ripened bananas. Perfect for breakfast and smoothies.'),
  ('fruits', 'Shimla Apples', 'shimla-apples', 'kg', 'Shimla, Himachal Pradesh', true, 'Crisp, juicy red apples from the hills of Himachal.'),
  ('fruits', 'Pomegranate', 'pomegranate', 'kg', 'Solapur, Maharashtra', true, 'Deep red, sweet arils packed with flavour.'),
  ('fruits', 'Papaya', 'papaya', 'piece', 'Andhra Pradesh', false, 'Sweet, orange-fleshed papaya, ready to eat in 1–2 days.'),
  ('fruits', 'Guava', 'guava', 'kg', 'Allahabad, Uttar Pradesh', false, 'Fragrant white guavas with a gentle crunch.'),
  ('fruits', 'Nagpur Oranges', 'nagpur-oranges', 'kg', 'Nagpur, Maharashtra', false, 'Juicy, easy-to-peel oranges bursting with tang.'),
  ('vegetables', 'Tomatoes', 'tomatoes', 'kg', 'Kolar, Karnataka', true, 'Firm, ripe tomatoes for curries, salads and chutneys.'),
  ('vegetables', 'Onions', 'onions', 'kg', 'Nashik, Maharashtra', true, 'Pungent red onions with a long shelf life.'),
  ('vegetables', 'Potatoes', 'potatoes', 'kg', 'Agra, Uttar Pradesh', false, 'All-purpose potatoes for every Indian kitchen.'),
  ('vegetables', 'Carrots', 'carrots', 'kg', 'Ooty, Tamil Nadu', false, 'Sweet, crunchy carrots from the Nilgiris.'),
  ('vegetables', 'Lady Finger (Bhindi)', 'lady-finger', 'kg', 'Local farms', false, 'Tender, young okra, hand-sorted for freshness.'),
  ('vegetables', 'Green Capsicum', 'green-capsicum', 'kg', 'Local farms', false, 'Glossy, thick-walled capsicum.'),
  ('leafy-greens-herbs', 'Spinach (Palak)', 'spinach', 'bunch', 'Local farms', true, 'Tender spinach leaves, washed and bunched.'),
  ('leafy-greens-herbs', 'Coriander', 'coriander', 'bunch', 'Local farms', false, 'Fragrant coriander with roots, for the perfect garnish.'),
  ('leafy-greens-herbs', 'Mint (Pudina)', 'mint', 'bunch', 'Local farms', false, 'Cool, aromatic mint for chutneys and drinks.'),
  ('exotics', 'Hass Avocado', 'hass-avocado', 'piece', 'Imported', false, 'Buttery Hass avocados. Ripen at room temperature.'),
  ('exotics', 'Broccoli', 'broccoli', 'kg', 'Pune, Maharashtra', false, 'Tight green florets, great steamed or stir-fried.')
)
insert into public.products (category_id, name, slug, base_unit, origin, is_featured, description)
select c.id, p.name, p.slug, p.unit::public.unit_type, p.origin, p.featured, p.descr
from p join public.categories c on c.slug = p.cat
on conflict (slug) do nothing;

-- Sizes: label, how much stock each uses, price, MRP
with v(slug, label, qty, price, mrp, ord) as (values
  ('robusta-bananas', '6 pcs', 0.5, 3500, null, 1), ('robusta-bananas', '1 dozen', 1, 6500, 7000, 2),
  ('shimla-apples', '500 g', 0.5, 9000, null, 1), ('shimla-apples', '1 kg', 1, 17500, 19000, 2),
  ('pomegranate', '500 g', 0.5, 8500, null, 1), ('pomegranate', '1 kg', 1, 16000, null, 2),
  ('papaya', '1 pc (approx. 1 kg)', 1, 5500, null, 1),
  ('guava', '500 g', 0.5, 4500, null, 1), ('guava', '1 kg', 1, 8500, null, 2),
  ('nagpur-oranges', '1 kg', 1, 9000, 10000, 1),
  ('tomatoes', '500 g', 0.5, 2000, null, 1), ('tomatoes', '1 kg', 1, 3800, 4200, 2),
  ('onions', '1 kg', 1, 4000, null, 1), ('onions', '2 kg', 2, 7800, null, 2),
  ('potatoes', '1 kg', 1, 3500, null, 1), ('potatoes', '2 kg', 2, 6800, null, 2),
  ('carrots', '500 g', 0.5, 3000, null, 1), ('carrots', '1 kg', 1, 5800, null, 2),
  ('lady-finger', '250 g', 0.25, 1800, null, 1), ('lady-finger', '500 g', 0.5, 3400, null, 2),
  ('green-capsicum', '250 g', 0.25, 2000, null, 1), ('green-capsicum', '500 g', 0.5, 3800, null, 2),
  ('spinach', '1 bunch', 1, 3000, null, 1),
  ('coriander', '1 bunch', 1, 1500, null, 1),
  ('mint', '1 bunch', 1, 1500, null, 1),
  ('hass-avocado', '1 pc', 1, 14900, 17900, 1), ('hass-avocado', '2 pcs', 2, 28500, null, 2),
  ('broccoli', '250 g', 0.25, 6000, null, 1), ('broccoli', '500 g', 0.5, 11500, null, 2)
)
insert into public.product_variants (product_id, label, quantity_in_base, price_paise, mrp_paise, sort_order)
select p.id, v.label, v.qty, v.price, v.mrp, v.ord
from v join public.products p on p.slug = v.slug
on conflict (product_id, label) do nothing;

-- Opening stock (in each product's base unit). Some deliberately low to show warnings.
update public.inventory i set stock_quantity = s.qty, low_stock_threshold = s.thr
from (values
  ('robusta-bananas', 20, 3), ('shimla-apples', 25, 5), ('pomegranate', 12, 3), ('papaya', 8, 2),
  ('guava', 4, 5), ('nagpur-oranges', 30, 5), ('tomatoes', 40, 8), ('onions', 60, 10), ('potatoes', 60, 10),
  ('carrots', 15, 4), ('lady-finger', 10, 3), ('green-capsicum', 2, 3), ('spinach', 25, 5), ('coriander', 30, 6),
  ('mint', 0, 5), ('hass-avocado', 10, 3), ('broccoli', 6, 2)
) as s(slug, qty, thr)
join public.products p on p.slug = s.slug
where i.product_id = p.id;

update public.business_settings set
  business_name = 'Fresh Basket',
  tagline = 'Hand-picked fruits and vegetables from trusted farms, delivered the same day.',
  city = 'Bengaluru', state = 'Karnataka'
where id = 1 and business_name = 'Fresh Basket';

-- Court Side Kino – Seed Data
-- Run after schema.sql

-- ============================================================
-- FILMS
-- ============================================================
INSERT INTO films (title, slug, description, genre, duration_min, rating, trailer_url, poster_url, backdrop_url, director, cast, is_featured) VALUES
(
  'Top Gun: Maverick',
  'top-gun-maverick',
  'Nach mehr als dreißig Jahren als einer der besten Navy-Piloten kehrt Pete „Maverick" Mitchell in die Welt zurück, in der er am besten ist. Dort muss er mit den Geistern seiner Vergangenheit konfrontiert werden und eine gefährliche Mission fliegen.',
  'Action',
  131,
  'FSK 12',
  'https://www.youtube.com/watch?v=qSqVVswa420',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&h=1080&fit=crop',
  'Joseph Kosinski',
  ARRAY['Tom Cruise', 'Miles Teller', 'Jennifer Connelly'],
  true
),
(
  'Babylon',
  'babylon',
  'Ein episches Drama über den Aufstieg und Fall von Hollywood in den 1920er Jahren – eine Zeit des Exzesses, der Dekadenz und des Wahnsinns.',
  'Drama',
  189,
  'FSK 16',
  'https://www.youtube.com/watch?v=5muQK7CuFtY',
  'https://images.unsplash.com/photo-1478720568477-152d9badaebc?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1440409856431-0b4a9387c8a0?w=1920&h=1080&fit=crop',
  'Damien Chazelle',
  ARRAY['Brad Pitt', 'Margot Robbie', 'Diego Calva'],
  true
),
(
  'The Grand Budapest Hotel',
  'grand-budapest-hotel',
  'Die Abenteuer des legendären Concierge Gustave H. und seines treuen Lobby Boys Zero Moustafa in einem berühmten europäischen Hotel zwischen den Weltkriegen.',
  'Komödie',
  100,
  'FSK 12',
  'https://www.youtube.com/watch?v=1Fg5iWjQ-jk',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1485846232355-39bcf4fb5642?w=1920&h=1080&fit=crop',
  'Wes Anderson',
  ARRAY['Ralph Fiennes', 'Tony Revolori', 'Saoirse Ronan'],
  false
),
(
  'La La Land',
  'la-la-land',
  'Mia, eine aufstrebende Schauspielerin, und Sebastian, ein Jazzpianist, verlieben sich in Los Angeles und kämpfen um ihre Träume.',
  'Musical',
  128,
  'FSK 6',
  'https://www.youtube.com/watch?v=0pdqf4P9MB8',
  'https://images.unsplash.com/photo-1518676590649-79506e461ff2?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1517602304772-9a3a2c2c0f0e?w=1920&h=1080&fit=crop',
  'Damien Chazelle',
  ARRAY['Ryan Gosling', 'Emma Stone'],
  false
),
(
  'Cinema Paradiso',
  'cinema-paradiso',
  'Ein Filmemacher erinnert sich an seine Kindheit in einem kleinen sizilianischen Dorf und an den Projektionisten Alfredo, der seine Leidenschaft fürs Kino weckte.',
  'Drama',
  155,
  'FSK 6',
  'https://www.youtube.com/watch?v=C2Ul2jK5v8I',
  'https://images.unsplash.com/photo-1440409856431-0b4a9387c8a0?w=400&h=600&fit=crop',
  'https://images.unsplash.com/photo-1485846232355-39bcf4fb5642?w=1920&h=1080&fit=crop',
  'Giuseppe Tornatore',
  ARRAY['Philippe Noiret', 'Salvatore Cascio'],
  true
);

-- ============================================================
-- SCREENINGS (Summer 2026)
-- ============================================================
INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student)
SELECT f.id, '2026-06-20', '21:00', 80, 80, 12.00, 8.00, 10.00
FROM films f WHERE f.slug = 'top-gun-maverick';

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student)
SELECT f.id, '2026-06-27', '21:00', 80, 80, 12.00, 8.00, 10.00
FROM films f WHERE f.slug = 'babylon';

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student)
SELECT f.id, '2026-07-04', '21:00', 80, 80, 12.00, 8.00, 10.00
FROM films f WHERE f.slug = 'grand-budapest-hotel';

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student)
SELECT f.id, '2026-07-11', '21:00', 80, 80, 12.00, 8.00, 10.00
FROM films f WHERE f.slug = 'la-la-land';

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student)
SELECT f.id, '2026-07-18', '21:00', 80, 80, 12.00, 8.00, 10.00
FROM films f WHERE f.slug = 'cinema-paradiso';

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student)
SELECT f.id, '2026-07-25', '21:00', 80, 80, 12.00, 8.00, 10.00
FROM films f WHERE f.slug = 'top-gun-maverick';

-- ============================================================
-- SEAT AVAILABILITY (80 seats per screening)
-- ============================================================
INSERT INTO seat_availability (screening_id, seat_number, is_available)
SELECT s.id, generate_series(1, 80), true
FROM screenings s;

-- ============================================================
-- MENU ITEMS
-- ============================================================
INSERT INTO menu_items (category, name, description, price, allergens, is_vegan, is_vegetarian, sort_order) VALUES
-- Popcorn
('popcorn', 'Klassisches Popcorn', 'Frisch gepoppt, leicht gesalzen', 4.50, ARRAY['Gluten'], false, true, 1),
('popcorn', 'Karamell-Popcorn', 'Süßes Karamell-Popcorn der Popcornakademie', 5.50, ARRAY['Gluten', 'Milch'], false, true, 2),
('popcorn', 'Käse-Popcorn', 'Würziges Käse-Popcorn', 5.00, ARRAY['Gluten', 'Milch'], false, true, 3),
('popcorn', 'Chili-Popcorn', 'Feurig scharf – für Mutige', 5.00, ARRAY['Gluten'], true, true, 4),
-- Süßes
('suess', 'Schokobrötchen', 'Frisch gebacken, Schokolade', 3.50, ARRAY['Gluten', 'Milch', 'Eier'], false, true, 1),
('suess', 'Eisbecher', 'Vanille, Schokolade oder Erdbeere', 4.00, ARRAY['Milch'], false, true, 2),
('suess', 'Gummibärchen', 'Haribo Mix, 200g', 3.00, ARRAY['Gelatine'], false, true, 3),
-- Salzig
('salzig', 'Brezel', 'Bayerische Laugenbrezel', 3.50, ARRAY['Gluten'], false, true, 1),
('salzig', 'Nachos mit Käse', 'Tortilla-Chips mit Käsesoße', 5.50, ARRAY['Gluten', 'Milch'], false, true, 2),
('salzig', 'Currywurst', 'Mit Pommes', 7.50, ARRAY['Gluten', 'Senf'], false, false, 3),
-- Getränke
('getraenk', 'Cola / Fanta / Sprite', '0,33l Dose', 3.00, '{}', true, true, 1),
('getraenk', 'Wasser still / sprudelnd', '0,5l Flasche', 2.50, '{}', true, true, 2),
('getraenk', 'Apfelschorle', '0,5l', 3.00, '{}', true, true, 3),
-- Bier
('bier', 'Augustiner Helles', '0,5l vom Fass', 4.50, ARRAY['Gluten'], true, true, 1),
('bier', 'Radler', 'Helles mit Zitronenlimo', 4.50, ARRAY['Gluten'], true, true, 2),
('bier', 'Weizenbier', 'Bayerisches Weizen, 0,5l', 4.80, ARRAY['Gluten'], true, true, 3),
-- Cocktails (alkoholfrei)
('cocktail', 'Court Side Spritz', 'Aperol-Spritz-Style, alkoholfrei', 6.50, '{}', true, true, 1),
('cocktail', 'Tennis Ball Cooler', 'Minze, Limette, Ginger Ale', 5.50, '{}', true, true, 2),
-- Kombis
('kombi', 'Filmabend-Paket', 'Popcorn + Getränk', 7.00, ARRAY['Gluten'], false, true, 1),
('kombi', 'Date Night', '2x Popcorn + 2x Getränk + Süßigkeit', 18.00, ARRAY['Gluten', 'Milch'], false, true, 2);

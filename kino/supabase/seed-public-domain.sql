-- Court Side Kino – Public Domain Films Seed (Screenings)
-- Run AFTER migration-films-api.sql AND film sync (admin-sync.html or worker)
-- Creates late summer / autumn 2026 screenings for all public-domain films

-- Mark first 3 as featured
UPDATE films SET is_featured = true
WHERE slug IN ('metropolis', 'nosferatu', 'night-of-the-living-dead')
  AND is_public_domain = true;

-- Screenings (Fridays, Aug–Oct 2026)
INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student, weather_note)
SELECT f.id, '2026-08-14', '21:00', 48, 48, 10.00, 10.00, 10.00, NULL
FROM films f WHERE f.slug = 'nosferatu' AND is_public_domain = true
ON CONFLICT DO NOTHING;

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student, weather_note)
SELECT f.id, '2026-08-21', '21:00', 48, 48, 10.00, 10.00, 10.00, NULL
FROM films f WHERE f.slug = 'metropolis' AND is_public_domain = true;

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student, weather_note)
SELECT f.id, '2026-08-28', '21:00', 48, 48, 10.00, 10.00, 10.00, NULL
FROM films f WHERE f.slug = 'cabinet-des-dr-caligari' AND is_public_domain = true;

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student, weather_note)
SELECT f.id, '2026-09-04', '21:00', 48, 48, 10.00, 10.00, 10.00, NULL
FROM films f WHERE f.slug = 'night-of-the-living-dead' AND is_public_domain = true;

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student, weather_note)
SELECT f.id, '2026-09-11', '21:00', 48, 48, 10.00, 10.00, 10.00, NULL
FROM films f WHERE f.slug = 'battleship-potemkin' AND is_public_domain = true;

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student, weather_note)
SELECT f.id, '2026-09-18', '21:00', 48, 48, 10.00, 10.00, 10.00, NULL
FROM films f WHERE f.slug = 'man-with-a-movie-camera' AND is_public_domain = true;

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student, weather_note)
SELECT f.id, '2026-09-25', '20:30', 48, 48, 10.00, 10.00, 10.00, 'Familienabend'
FROM films f WHERE f.slug = 'steamboat-willie' AND is_public_domain = true;

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student, weather_note)
SELECT f.id, '2026-10-02', '20:30', 48, 48, 10.00, 10.00, 10.00, NULL
FROM films f WHERE f.slug = 'the-great-train-robbery' AND is_public_domain = true;

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student, weather_note)
SELECT f.id, '2026-10-09', '20:00', 48, 48, 10.00, 10.00, 10.00, NULL
FROM films f WHERE f.slug = 'sunrise' AND is_public_domain = true;

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student, weather_note)
SELECT f.id, '2026-10-16', '20:00', 48, 48, 10.00, 10.00, 10.00, NULL
FROM films f WHERE f.slug = 'freaks' AND is_public_domain = true;

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student, weather_note)
SELECT f.id, '2026-10-23', '20:00', 48, 48, 10.00, 10.00, 10.00, 'Halloween Special'
FROM films f WHERE f.slug = 'nosferatu' AND is_public_domain = true;

INSERT INTO screenings (film_id, screening_date, start_time, total_seats, available_seats, price_adult, price_child, price_student, weather_note)
SELECT f.id, '2026-10-30', '20:00', 48, 48, 10.00, 10.00, 10.00, 'Saisonfinale'
FROM films f WHERE f.slug = 'metropolis' AND is_public_domain = true;

-- Seat availability for new screenings
INSERT INTO seat_availability (screening_id, seat_number, is_available)
SELECT s.id, generate_series(1, 48), true
FROM screenings s
JOIN films f ON f.id = s.film_id
WHERE f.is_public_domain = true
  AND s.screening_date >= '2026-08-14'
ON CONFLICT (screening_id, seat_number) DO NOTHING;

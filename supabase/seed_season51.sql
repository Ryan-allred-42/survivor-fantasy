-- ============================================================
-- Survivor Season 51 — Full Cast Seed (21 players) + Episodes
-- Run this AFTER schema.sql in the Supabase SQL Editor
-- photo_url references /players/[slug].jpg in the public folder
--
-- Season 51 premiered Wednesday, September 23, 2026 (CBS).
-- Two starting tribes: Toka (11) and Savu (10).
-- Week 1 (Sept 23): Aaliyah Puglia voted out — 1st out, Day 3.
-- Cast bios from the official CBS press release (Paramount Press Express).
-- Tribe assignments from the season's contestant table.
-- ============================================================

-- Clear any existing Season 51 data first (safe to re-run)
DELETE FROM survivor_episodes WHERE season = 51;
DELETE FROM survivor_players WHERE season = 51;

INSERT INTO survivor_players
  (name, age, hometown, occupation, tribe, season, is_active, eliminated_week, placement, photo_url)
VALUES

-- ── TOKA TRIBE (11) ──────────────────────────────────────────
('Aaliyah Puglia',          24, 'Gloucester City, N.J.',         'Chef',                   'Toka', 51, false, 1,    1,    '/players/aaliyah-puglia.jpg'),
('Brady Booker',            27, 'La Salle, Ill.',                'Pro wrestler',           'Toka', 51, true,  NULL, NULL, '/players/brady-booker.jpg'),
('Patt Cannaday',           33, 'Tampa, Fla.',                   'Federal prosecutor',     'Toka', 51, true,  NULL, NULL, '/players/patt-cannaday.jpg'),
('Jenna Doore',             30, 'Perrysburg, Ohio',              'Wedding photographer',   'Toka', 51, true,  NULL, NULL, '/players/jenna-doore.jpg'),
('Lewis Kelly',             28, 'Dublin, Ireland',               'Farmer',                 'Toka', 51, true,  NULL, NULL, '/players/lewis-kelly.jpg'),
('Danny "Kilby" Kilby',     30, 'Mount Forest, Ontario, Canada', 'Game designer',          'Toka', 51, true,  NULL, NULL, '/players/danny-kilby.jpg'),
('Angelica "Jelly" Loblack',29, 'Garland, Texas',                'Sociology professor',    'Toka', 51, true,  NULL, NULL, '/players/angelica-jelly-loblack.jpg'),
('Maggie Nestor',           40, 'Middleway, W.Va.',              'Farmer',                 'Toka', 51, true,  NULL, NULL, '/players/maggie-nestor.jpg'),
('Thien An Nguyen',         24, 'Fort Worth, Texas',             'Medical student',        'Toka', 51, true,  NULL, NULL, '/players/thien-an-nguyen.jpg'),
('Mike Pinsky',             32, 'New York City, N.Y.',           'Baseball executive',     'Toka', 51, true,  NULL, NULL, '/players/mike-pinsky.jpg'),
('Devin Way',               33, 'Lufkin, Texas',                 'Actor',                  'Toka', 51, true,  NULL, NULL, '/players/devin-way.jpg'),

-- ── SAVU TRIBE (10) ──────────────────────────────────────────
('Rob Antonson',            40, 'Johnston, R.I.',                'Airline gate agent',     'Savu', 51, true,  NULL, NULL, '/players/rob-antonson.jpg'),
('Linnea Capobianco',       25, 'Kearny, N.J.',                  'Entrepreneur',           'Savu', 51, true,  NULL, NULL, '/players/linnea-capobianco.jpg'),
('Cristian Chavez',         26, 'Salt Lake City, Utah',          'Head of HR',             'Savu', 51, true,  NULL, NULL, '/players/cristian-chavez.jpg'),
('Sharonda Cox',            34, 'Pompano Beach, Fla.',           'Resident, OBGYN',        'Savu', 51, true,  NULL, NULL, '/players/sharonda-cox.jpg'),
('Kristin Flickinger',      49, 'Ketchum, Idaho',                'Crisis management',      'Savu', 51, true,  NULL, NULL, '/players/kristin-flickinger.jpg'),
('Ori Jean-Charles',        27, 'Spring Valley, N.Y.',           'Personal trainer',       'Savu', 51, true,  NULL, NULL, '/players/ori-jean-charles.jpg'),
('Carter Krull',            24, 'Rock Rapids, Iowa',             'Livestock farmer',       'Savu', 51, true,  NULL, NULL, '/players/carter-krull.jpg'),
('Alexis Levine',           34, 'Atlanta, Ga.',                  'Criminal defense attorney','Savu',51, true,  NULL, NULL, '/players/alexis-levine.jpg'),
('Eric Macksoud',           34, 'Lincoln, R.I.',                 'Mental health counselor','Savu', 51, true,  NULL, NULL, '/players/eric-macksoud.jpg'),
('Ana Sani',                34, 'Richmond Hill, Ontario, Canada','Voice actress',          'Savu', 51, true,  NULL, NULL, '/players/ana-sani.jpg');

-- ============================================================
-- Season 51 Episodes — Wednesday 8pm ET air dates
-- lock_time is the Wednesday 8pm ET deadline in UTC
-- (EDT = UTC-4 through Oct 28, EST = UTC-5 from Nov 4)
-- ============================================================

INSERT INTO survivor_episodes (season, week_number, air_date, lock_time) VALUES
(51,  1, '2026-09-23', '2026-09-24 00:00:00+00'),
(51,  2, '2026-09-30', '2026-10-01 00:00:00+00'),
(51,  3, '2026-10-07', '2026-10-08 00:00:00+00'),
(51,  4, '2026-10-14', '2026-10-15 00:00:00+00'),
(51,  5, '2026-10-21', '2026-10-22 00:00:00+00'),
(51,  6, '2026-10-28', '2026-10-29 00:00:00+00'),
(51,  7, '2026-11-04', '2026-11-05 01:00:00+00'),
(51,  8, '2026-11-11', '2026-11-12 01:00:00+00'),
(51,  9, '2026-11-18', '2026-11-19 01:00:00+00'),
(51, 10, '2026-11-25', '2026-11-26 01:00:00+00'),
(51, 11, '2026-12-02', '2026-12-03 01:00:00+00'),
(51, 12, '2026-12-09', '2026-12-10 01:00:00+00'),
(51, 13, '2026-12-16', '2026-12-17 01:00:00+00');

-- Week 1 already aired: Aaliyah Puglia voted out (1st out, Day 3)
UPDATE survivor_episodes
SET
  is_locked = true,
  is_complete = true,
  eliminated_player_id = (SELECT id FROM survivor_players WHERE season = 51 AND name = 'Aaliyah Puglia'),
  eliminated_player_ids = ARRAY[(SELECT id FROM survivor_players WHERE season = 51 AND name = 'Aaliyah Puglia')]
WHERE season = 51 AND week_number = 1;

-- ============================================================
-- Survivor Season 50 — Full Cast Seed (24 players)
-- Run this AFTER schema.sql in the Supabase SQL Editor
-- photo_url references /players/[slug].jpg in the public folder
-- ============================================================

-- Clear any existing Season 50 placeholder players first
DELETE FROM survivor_players WHERE season = 50;

INSERT INTO survivor_players (name, age, hometown, occupation, tribe, season, is_active, photo_url) VALUES

-- ── CILA TRIBE (orange) ──────────────────────────────────────
('Joe Hunter',                   NULL, NULL, NULL,                  'Cila', 50, true, '/players/joe-hunter.jpg'),
('Savannah Louie',               NULL, NULL, NULL,                  'Cila', 50, true, '/players/savannah-louie.jpg'),
('Christian Hubicki',            35,   'Baltimore, MD', 'Robotics scientist',   'Cila', 50, true, '/players/christian-hubicki.jpg'),
('Cirie Fields',                 NULL, 'Walterboro, SC', 'Nurse',              'Cila', 50, true, '/players/cirie-fields.jpg'),
('Ozzy Lusth',                   NULL, NULL, 'Outdoorsman',                    'Cila', 50, true, '/players/ozzy-lusth.jpg'),
('Emily Flippen',                NULL, NULL, 'Investment analyst',             'Cila', 50, true, '/players/emily-flippen.jpg'),
('Rick Devens',                  NULL, 'Leland, NC', 'Morning news anchor',    'Cila', 50, true, '/players/rick-devens.jpg'),
('Jenna Lewis-Dougherty',        NULL, NULL, NULL,                             'Cila', 50, true, '/players/jenna-lewis-dougherty.jpg'),

-- ── KALO TRIBE (teal) ────────────────────────────────────────
('Jonathan Young',               NULL, NULL, NULL,                  'Kalo', 50, true, '/players/jonathan-young.jpg'),
('Dee Valladares',               NULL, NULL, 'Entrepreneur',        'Kalo', 50, true, '/players/dee-valladares.jpg'),
('Mike White',                   NULL, 'San Diego, CA', 'Filmmaker/writer',    'Kalo', 50, true, '/players/mike-white.jpg'),
('Kamilla Karthigesu',           NULL, NULL, NULL,                  'Kalo', 50, true, '/players/kamilla-karthigesu.jpg'),
('Charlie Davis',                NULL, NULL, 'Law student',         'Kalo', 50, true, '/players/charlie-davis.jpg'),
('Tiffany Ervin',                NULL, NULL, NULL,                  'Kalo', 50, true, '/players/tiffany-ervin.jpg'),
('Benjamin "Coach" Wade',        NULL, 'Susanville, CA', 'Soccer coach/conductor', 'Kalo', 50, true, '/players/benjamin-coach-wade.jpg'),
('Chrissy Hofbeck',              NULL, NULL, 'Actuary',             'Kalo', 50, true, '/players/chrissy-hofbeck.jpg'),

-- ── VATU TRIBE (magenta) ─────────────────────────────────────
('Colby Donaldson',              NULL, 'Christoval, TX', 'Real estate developer', 'Vatu', 50, true, '/players/colby-donaldson.jpg'),
('Genevieve Mushaluk',           NULL, NULL, 'Corporate lawyer',    'Vatu', 50, true, '/players/genevieve-mushaluk.jpg'),
('Rizo Velovic',                 NULL, NULL, NULL,                  'Vatu', 50, true, '/players/rizo-velovic.jpg'),
('Angelina Keeley',              NULL, NULL, 'Financial consultant', 'Vatu', 50, true, '/players/angelina-keeley.jpg'),
('Q Burdette',                   NULL, NULL, 'Realtor',             'Vatu', 50, true, '/players/q-burdette.jpg'),
('Stephenie LaGrossa Kendrick',  NULL, NULL, NULL,                  'Vatu', 50, true, '/players/stephenie-lagrossa-kendrick.jpg'),
('Kyle Fraser',                  NULL, NULL, NULL,                  'Vatu', 50, true, '/players/kyle-fraser.jpg'),
('Aubry Bracco',                 NULL, NULL, 'Content creator',     'Vatu', 50, true, '/players/aubry-bracco.jpg');

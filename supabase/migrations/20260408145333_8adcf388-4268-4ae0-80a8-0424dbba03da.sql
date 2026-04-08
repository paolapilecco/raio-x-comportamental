-- Link all orphan sessions for paolabem@gmail.com to their managed_person
UPDATE diagnostic_sessions
SET person_id = 'd81d1fe1-bb38-4ea6-b6f1-09273d0e3c10'
WHERE user_id = 'e4dafc21-4600-425d-8026-42ed14e06010'
  AND person_id IS NULL;
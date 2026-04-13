
DO $$
DECLARE
  uid uuid := 'e4dafc21-4600-425d-8026-42ed14e06010';
  mod_id uuid := 'e56ef334-af3b-475c-b7cb-c5215b991d89';
  sess_id uuid := gen_random_uuid();
  q_ids uuid[] := ARRAY[
    '2356f090-5489-47de-97b6-8ff953318abe','fd301ca1-4cf6-4e93-b968-9a5205791a2b',
    'c667372d-2de5-4e32-8c10-e4bbb75092b6','e1b63a87-ae02-484a-9f7a-f60ab2c640be',
    '999563c1-60aa-45ae-866d-016aa4cbd838','9b1aa429-04ae-4006-9364-0b699c34f382',
    'e06821b3-2038-4387-a97e-271d2584b6b8','29673f75-ee9b-401f-83ee-9c4f3127f051',
    '33725d4e-7fd0-4f6b-8dda-1108352c3dd5','58403fa6-16ad-409e-b956-cdcf0d4b95b6',
    '6338aba8-0801-4de3-9440-e3832e466472','6b826842-f6fd-4970-a5aa-52e162df5bb4',
    '6bbfe7ee-fba4-448d-8a0b-23e0075baac7','c5954c44-50b2-4149-ad9d-98b6eb5a3b6e',
    'e55ab9b5-9a2b-48ce-9ecd-aeb99209d156','1ec16311-ba5f-4086-8cdb-b8426ee74581',
    'c63c2ffd-995d-42fc-a26e-85901856c9b3','28fafc70-038f-4e08-bc61-10fdd2e616a0',
    '8553a362-5e1d-4036-8a09-b9d41c94f4e2','509c9f31-5628-4e22-964b-853be91e7732',
    'f763aed6-fc0a-447c-97e1-647e3f3455e3','6412dee6-2c2a-4c25-a074-b881ffadecba',
    '2d678328-1270-49f6-8509-bbca982b3099','ad81e06d-16ac-4de0-919e-a1a5437a4aac',
    'f618d33d-5a7f-41a4-99e7-f00191e2bd11','94b9eb2c-66e1-494f-b618-aa2d09af02a7',
    'a61c3f0e-b559-44a2-b6f0-5673142c57ed','53ef24be-7fbe-49ff-9b0e-4dd15046d907',
    '2e21d02c-195f-4291-bafe-72106025dbe5','19d690cc-8734-4d39-943e-f24fa4538e3a',
    '047d7828-2b62-4df9-9927-fb8c80f3456e','b501a116-1182-4a8b-82cf-b0fa53be84d1',
    '4345e030-4e5c-4b64-9003-3d6f5bec27ce','c568fcd4-2dd9-44ad-8a4b-01301314e486',
    'c70d20b2-119e-41f2-a325-7c5cfe1d2684','321016c3-7818-4028-8090-d1a4e85992e4'
  ];
  answers int[] := ARRAY[5,4,3,5,2,4,5,3,4,2,5,3,4,5,2,3,5,4,3,5,4,2,5,3,4,5,3,4,2,5,4,3,5,4,3,5];
  i int;
BEGIN
  -- Create session
  INSERT INTO public.diagnostic_sessions (id, user_id, test_module_id, created_at)
  VALUES (sess_id, uid, mod_id, now());
  
  -- Insert answers
  FOR i IN 1..36 LOOP
    INSERT INTO public.diagnostic_answers (session_id, question_id, answer_value)
    VALUES (sess_id, i, answers[i]);
  END LOOP;
  
  RAISE NOTICE 'Created session % with 36 answers', sess_id;
END $$;

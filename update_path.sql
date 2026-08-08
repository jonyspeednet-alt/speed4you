UPDATE content_catalog SET 
  payload = jsonb_set(
    jsonb_set(
      payload,
      '{sourcePath}', '"/var/www/html/English_Movies/2022/13:14: El Reto de Ayudar (2022).mp4"'::jsonb
    ),
    '{videoUrl}', '"/English_Movies/2022/13%3A14%3A%20El%20Reto%20de%20Ayudar%20(2022).mp4"'::jsonb
  )
WHERE id = 33957;

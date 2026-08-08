UPDATE content_catalog SET 
  payload = jsonb_set(payload, '{title}', '"13:14: El Reto de Ayudar"'::jsonb),
  title = '13:14: El Reto de Ayudar'
WHERE id = 33957;

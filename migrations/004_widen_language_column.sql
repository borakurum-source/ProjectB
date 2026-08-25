-- clients.language was VARCHAR(10) (sized for an ISO code like "tr"), but real
-- client profiles store a free-text value like "Turkish & English" (17+ chars).
ALTER TABLE clients ALTER COLUMN language TYPE VARCHAR(100);

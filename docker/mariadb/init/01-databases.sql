-- Se ejecuta UNA sola vez, cuando el volumen de MariaDB está vacío.
-- (Si necesitas re-ejecutarlo: docker compose down -v && docker compose up -d)

CREATE DATABASE IF NOT EXISTS annotation_portal_dev
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS annotation_portal_prod
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- El usuario de la app (MARIADB_USER) ya existe en este punto.
GRANT ALL PRIVILEGES ON annotation_portal_dev.*  TO 'app'@'%';
GRANT ALL PRIVILEGES ON annotation_portal_prod.* TO 'app'@'%';
FLUSH PRIVILEGES;

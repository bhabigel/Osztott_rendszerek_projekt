-- Task 9: MySQL adatbázis beüzemelése
-- Futtatás: mysql -u root -p < database/mysql/schema.sql

CREATE DATABASE IF NOT EXISTS voting_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE voting_system;

-- Szavazatok táblája
-- bet_id: MongoDB ObjectId (24 hex karakter) — a szavazás azonosítója
-- voter_id: felhasználó azonosítója (user:<userId> vagy anon:<ip>)
-- UNIQUE(bet_id, voter_id): egy szavazó csak egyszer szavazhat ugyanarra a kérdésre
CREATE TABLE IF NOT EXISTS votes (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    bet_id     VARCHAR(24)  NOT NULL,
    option_val VARCHAR(255) NOT NULL,
    voter_id   VARCHAR(255) NOT NULL,
    region     VARCHAR(100) DEFAULT NULL,
    city       VARCHAR(100) DEFAULT NULL,
    voted_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_vote (bet_id, voter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

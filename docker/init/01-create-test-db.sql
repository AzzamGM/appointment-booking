-- Runs once on first container startup (as the "medibook" superuser).
-- Creates a separate database for integration tests so they never touch dev data.
CREATE DATABASE medibook_test OWNER medibook;

-- One-time setup, run as the database owner inside the Postgres container.
-- No password: the role can only connect through the container's local socket.
-- CONNECT on the database is already granted to PUBLIC by default.
CREATE ROLE ml_readonly LOGIN;
ALTER ROLE ml_readonly SET default_transaction_read_only = on;
GRANT USAGE ON SCHEMA public TO ml_readonly;
GRANT SELECT ON public.price_history TO ml_readonly;

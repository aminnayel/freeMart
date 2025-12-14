CREATE USER supermarket_user WITH ENCRYPTED PASSWORD 'supermarket_pass';
GRANT ALL PRIVILEGES ON DATABASE supermarket TO supermarket_user;
\c supermarket
GRANT ALL ON SCHEMA public TO supermarket_user;

if (!process.env.DB_PASSWORD) {
  throw new Error('Set DB_PASSWORD explicitly before running a database utility.');
}

process.env.PGPASSWORD = process.env.DB_PASSWORD;

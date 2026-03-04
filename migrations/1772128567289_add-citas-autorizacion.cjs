exports.up = (pgm) => {
  // categoria
  pgm.sql(`
    ALTER TABLE citas
    ADD COLUMN IF NOT EXISTS categoria varchar(30) NOT NULL DEFAULT 'LEVANTAMIENTO';
  `);

  // columnas de autorización
  pgm.sql(`
    ALTER TABLE citas
    ADD COLUMN IF NOT EXISTS auth_estado varchar(20) NOT NULL DEFAULT 'PENDIENTE',
    ADD COLUMN IF NOT EXISTS auth_by integer REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS auth_at timestamp,
    ADD COLUMN IF NOT EXISTS auth_motivo text;
  `);

  // index (idempotente)
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS citas_categoria_auth_estado_index
    ON citas (categoria, auth_estado);
  `);
};

exports.down = (pgm) => {
  // OJO: En down NO borres columnas si ya dependes de ellas en prod.
  // En dev puedes dejarlas, o borrar condicionalmente.

  pgm.sql(`DROP INDEX IF EXISTS citas_categoria_auth_estado_index;`);

  // Si quieres un down "safe" (yo prefiero NO borrar columnas):
  // pgm.sql(`ALTER TABLE citas DROP COLUMN IF EXISTS auth_motivo;`);
  // pgm.sql(`ALTER TABLE citas DROP COLUMN IF EXISTS auth_at;`);
  // pgm.sql(`ALTER TABLE citas DROP COLUMN IF EXISTS auth_by;`);
  // pgm.sql(`ALTER TABLE citas DROP COLUMN IF EXISTS auth_estado;`);
  // pgm.sql(`ALTER TABLE citas DROP COLUMN IF EXISTS categoria;`);
};

exports.down = (pgm) => {
  pgm.dropIndex("citas", ["categoria", "auth_estado"]);
  pgm.dropColumns("citas", ["categoria", "auth_estado", "auth_by", "auth_at", "auth_motivo"]);
};
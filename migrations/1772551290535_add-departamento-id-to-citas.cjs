exports.up = (pgm) => {
  // 1) Agrega la columna solo si no existe
  pgm.sql(`
    ALTER TABLE citas
    ADD COLUMN IF NOT EXISTS departamento_id INTEGER;
  `);

  // 2) Agrega FK solo si no existe
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_citas_departamento'
      ) THEN
        ALTER TABLE citas
        ADD CONSTRAINT fk_citas_departamento
        FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
        ON DELETE SET NULL;
      END IF;
    END $$;
  `);

  // 3) Index útil (solo si no existe)
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_citas_depto_categoria_auth
    ON citas (departamento_id, categoria, auth_estado);
  `);

  // 4) Backfill a VENTAS para las comerciales existentes
  pgm.sql(`
    UPDATE citas
    SET departamento_id = (
      SELECT id FROM departamentos WHERE UPPER(nombre)='VENTAS' LIMIT 1
    )
    WHERE categoria='VISITA_COMERCIAL'
      AND departamento_id IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_citas_depto_categoria_auth;`);

  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_citas_departamento'
      ) THEN
        ALTER TABLE citas DROP CONSTRAINT fk_citas_departamento;
      END IF;
    END $$;
  `);

  pgm.sql(`
    ALTER TABLE citas
    DROP COLUMN IF EXISTS departamento_id;
  `);
};
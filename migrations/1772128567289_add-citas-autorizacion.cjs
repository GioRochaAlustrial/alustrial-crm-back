// exports.up = (pgm) => {
//   // categoria: LEVANTAMIENTO | VISITA_COMERCIAL
//   pgm.addColumn("citas", {
//     categoria: { type: "varchar(30)", notNull: true, default: "LEVANTAMIENTO" },
//   });

//   // autorización
//   pgm.addColumns("citas", {
//     auth_estado: { type: "varchar(20)", notNull: true, default: "PENDIENTE" }, // PENDIENTE|AUTORIZADA|RECHAZADA
//     auth_by: { type: "integer", references: "usuarios", onDelete: "SET NULL" },
//     auth_at: { type: "timestamp", notNull: false },
//     auth_motivo: { type: "text", notNull: false },
//   });

//   pgm.createIndex("citas", ["categoria", "auth_estado"]);
// };

// exports.down = (pgm) => {
//   pgm.dropIndex("citas", ["categoria", "auth_estado"]);
//   pgm.dropColumns("citas", ["categoria", "auth_estado", "auth_by", "auth_at", "auth_motivo"]);
// };

exports.up = (pgm) => {
  // Verifica si la columna "categoria" ya existe antes de crearla
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'citas' AND column_name = 'categoria'
      ) THEN
        ALTER TABLE citas
        ADD COLUMN categoria varchar(30) DEFAULT 'LEVANTAMIENTO' NOT NULL;
      END IF;
    END
    $$;
  `);

  // Columnas de autorización (tolerantes también)
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'citas' AND column_name = 'auth_estado'
      ) THEN
        ALTER TABLE citas
        ADD COLUMN auth_estado varchar(20) DEFAULT 'PENDIENTE' NOT NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'citas' AND column_name = 'auth_by'
      ) THEN
        ALTER TABLE citas
        ADD COLUMN auth_by integer REFERENCES usuarios ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'citas' AND column_name = 'auth_at'
      ) THEN
        ALTER TABLE citas
        ADD COLUMN auth_at timestamp NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'citas' AND column_name = 'auth_motivo'
      ) THEN
        ALTER TABLE citas
        ADD COLUMN auth_motivo text NULL;
      END IF;
    END
    $$;
  `);

  // Índice (también idempotente)
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'citas' AND indexname = 'citas_categoria_auth_estado_index'
      ) THEN
        CREATE INDEX citas_categoria_auth_estado_index
        ON citas (categoria, auth_estado);
      END IF;
    END
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS citas_categoria_auth_estado_index;
    ALTER TABLE citas
      DROP COLUMN IF EXISTS categoria,
      DROP COLUMN IF EXISTS auth_estado,
      DROP COLUMN IF EXISTS auth_by,
      DROP COLUMN IF EXISTS auth_at,
      DROP COLUMN IF EXISTS auth_motivo;
  `);
};
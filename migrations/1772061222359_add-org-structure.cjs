exports.up = (pgm) => {
  pgm.addColumns("usuarios", {
    cargo: { type: "varchar(50)", notNull: false },
    supervisor_id: {
      type: "integer",
      notNull: false,
      references: "usuarios",
      onDelete: "SET NULL",
    },
    es_jefe: {
      type: "boolean",
      notNull: true,
      default: false,
    },
    departamento_id: {
      type: "integer",
      notNull: false,
    },
  });

  pgm.createTable("departamentos", {
    id: "id",
    nombre: { type: "varchar(100)", notNull: true, unique: true },
    gerente_id: {
      type: "integer",
      notNull: false,
      references: "usuarios",
      onDelete: "SET NULL",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.addConstraint("usuarios", "usuarios_departamento_fk", {
    foreignKeys: {
      columns: "departamento_id",
      references: "departamentos(id)",
      onDelete: "SET NULL",
    },
  });

  pgm.sql(`
    INSERT INTO departamentos (nombre)
    VALUES 
      ('VENTAS'),
      ('HVAC'),
      ('ELECTRICA'),
      ('CIVIL'),
      ('ATM/CONTROL')
    ON CONFLICT (nombre) DO NOTHING;
  `);

  pgm.sql(`
    UPDATE usuarios u
    SET departamento_id = d.id
    FROM departamentos d
    WHERE u.departamento_id IS NULL
      AND UPPER(TRIM(u.departamento)) = UPPER(TRIM(d.nombre));
  `);
};

exports.down = (pgm) => {
  pgm.dropConstraint("usuarios", "usuarios_departamento_fk");
  pgm.dropTable("departamentos");
  pgm.dropColumns("usuarios", ["cargo", "supervisor_id", "es_jefe", "departamento_id"]);
};
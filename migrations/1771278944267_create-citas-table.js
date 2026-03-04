/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export const up = (pgm) => {
  pgm.createTable("citas", {
    id: "id",
    id_prospectos: {
      type: "integer",
      notNull: true,
      references: '"prospectos"',
      onDelete: "cascade",
    },
    id_usuarios: {
      type: "integer",
      notNull: true,
      references: '"usuarios"',
      onDelete: "cascade",
    },
    fecha_hora: {
      type: "timestamp",
      notNull: true,
    },
    nota: {
      type: "text",
    },
    estado: {
      type: "varchar(20)",
      notNull: true,
      default: "PROGRAMADA",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
    updated_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.createIndex("citas", "id_prospectos");
  pgm.createIndex("citas", "id_usuarios");
  pgm.createIndex("citas", "fecha_hora");
};

export const down = (pgm) => {
  pgm.dropTable("citas");
};
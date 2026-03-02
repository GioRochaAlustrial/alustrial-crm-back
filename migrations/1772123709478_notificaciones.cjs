exports.up = (pgm) => {
  pgm.createTable("notificaciones", {
    id: "id",
    id_usuario: {
      type: "integer",
      notNull: true,
      references: "usuarios",
      onDelete: "CASCADE",
    },
    tipo: { type: "varchar(60)", notNull: true },
    payload: { type: "jsonb", notNull: true, default: pgm.func("'{}'::jsonb") },
    leida: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("NOW()") },
  });

  pgm.createIndex("notificaciones", ["id_usuario", "leida"]);
};

exports.down = (pgm) => {
  pgm.dropTable("notificaciones");
};
exports.up = (pgm) => {
  pgm.createTable("citas_asignaciones", {
    id: "id",
    id_cita: {
      type: "integer",
      notNull: true,
      references: "citas",
      onDelete: "CASCADE",
    },
    id_usuario: {
      type: "integer",
      notNull: true,
      references: "usuarios",
      onDelete: "CASCADE",
    },
    assigned_by: {
      type: "integer",
      notNull: true,
      references: "usuarios",
      onDelete: "SET NULL",
    },
    assigned_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("NOW()"),
    },
  });

  pgm.addConstraint("citas_asignaciones", "unique_cita_usuario", {
    unique: ["id_cita", "id_usuario"],
  });

  pgm.createIndex("citas_asignaciones", "id_usuario");
  pgm.createIndex("citas_asignaciones", "id_cita");
};

exports.down = (pgm) => {
  pgm.dropTable("citas_asignaciones");
};
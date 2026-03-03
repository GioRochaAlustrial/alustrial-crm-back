exports.up = (pgm) => {
  // categoria cita: levantamiento / visita comercial
pgm.addColumn(
    "citas",
    {
      categoria: {
        type: "varchar(30)",
        notNull: true,
        default: "LEVANTAMIENTO",
      },
    },
    { ifNotExists: true } // ← evita error si la columna ya existe
  );

  // autorización
  pgm.addColumns("citas", {
    auth_estado: { type: "varchar(20)", notNull: true, default: "PENDIENTE" },
    auth_by: {
      type: "integer",
      notNull: false,
      references: "usuarios",
      onDelete: "SET NULL",
    },
    auth_at: { type: "timestamp", notNull: false },
    auth_motivo: { type: "text", notNull: false },
  });

  pgm.createIndex("citas", ["categoria", "auth_estado"]);
};

exports.down = (pgm) => {
  pgm.dropIndex("citas", ["categoria", "auth_estado"]);
  pgm.dropColumns("citas", ["categoria", "auth_estado", "auth_by", "auth_at", "auth_motivo"]);
};
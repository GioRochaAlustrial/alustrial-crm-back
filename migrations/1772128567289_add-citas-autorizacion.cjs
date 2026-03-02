exports.up = (pgm) => {
  // categoria: LEVANTAMIENTO | VISITA_COMERCIAL
  pgm.addColumn("citas", {
    categoria: { type: "varchar(30)", notNull: true, default: "LEVANTAMIENTO" },
  });

  // autorización
  pgm.addColumns("citas", {
    auth_estado: { type: "varchar(20)", notNull: true, default: "PENDIENTE" }, // PENDIENTE|AUTORIZADA|RECHAZADA
    auth_by: { type: "integer", references: "usuarios", onDelete: "SET NULL" },
    auth_at: { type: "timestamp", notNull: false },
    auth_motivo: { type: "text", notNull: false },
  });

  pgm.createIndex("citas", ["categoria", "auth_estado"]);
};

exports.down = (pgm) => {
  pgm.dropIndex("citas", ["categoria", "auth_estado"]);
  pgm.dropColumns("citas", ["categoria", "auth_estado", "auth_by", "auth_at", "auth_motivo"]);
};
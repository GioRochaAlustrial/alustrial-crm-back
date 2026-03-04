// migrations/XXXXXXXXXXXXXX_add_tipo_y_realizada_por_to_citas.js

export async function up(pgm) {
  // tipo
  pgm.addColumn("citas", {
    tipo: { type: "varchar(20)", notNull: true, default: "HVAC" },
  });

  // check constraint para tipo
  pgm.addConstraint("citas", "citas_tipo_check", {
    check: `tipo IN ('HVAC','ELECTRICA','CIVIL','ATM/CONTROL')`,
  });

  // realizada_por
  pgm.addColumn("citas", {
    realizada_por: { type: "int", notNull: false },
  });

  // FK hacia usuarios(id)
  pgm.addConstraint("citas", "citas_realizada_por_fk", {
    foreignKeys: {
      columns: "realizada_por",
      references: "usuarios(id)",
      onDelete: "SET NULL",
    },
  });
}

export async function down(pgm) {
  pgm.dropConstraint("citas", "citas_realizada_por_fk");
  pgm.dropColumn("citas", "realizada_por");

  pgm.dropConstraint("citas", "citas_tipo_check");
  pgm.dropColumn("citas", "tipo");
}
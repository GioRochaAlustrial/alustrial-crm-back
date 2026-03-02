export async function up(pgm) {
  pgm.addColumn("prospectos", {
    tipo_proyecto: { type: "varchar(50)", notNull: false }
  });
}

export async function down(pgm) {
  pgm.dropColumn("prospectos", "tipo_proyecto");
}
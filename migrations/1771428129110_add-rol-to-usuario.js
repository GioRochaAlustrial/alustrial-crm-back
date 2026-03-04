export async function up(pgm) {
  pgm.addColumn("usuarios", {
    rol: { type: "varchar(20)", notNull: true, default: "VENTAS" },
  });
  pgm.createIndex("usuarios", "rol");
}
export async function down(pgm) {
  pgm.dropIndex("usuarios", "rol");
  pgm.dropColumn("usuarios", "rol");
}
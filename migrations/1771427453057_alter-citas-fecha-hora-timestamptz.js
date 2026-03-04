export async function up(pgm) {
  // OJO: esto interpreta los valores actuales como UTC (porque hoy se están guardando como 16:00 cuando querías 10:00)
  pgm.alterColumn("citas", "fecha_hora", {
    type: "timestamptz",
    using: `fecha_hora AT TIME ZONE 'UTC'`,
    notNull: true,
  });
}

export async function down(pgm) {
  // Regresa a timestamp sin tz (si lo necesitas)
  pgm.alterColumn("citas", "fecha_hora", {
    type: "timestamp",
    using: `fecha_hora::timestamp`,
    notNull: true,
  });
}
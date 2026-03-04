export async function up(pgm) {
  pgm.createTable("usuarios", {
    id: "id",
    nombre: { type: "varchar(50)", notNull: true },
    correo: { type: "varchar(50)", notNull: true, unique: true },
    telefono: { type: "varchar(15)", notNull: true },
    departamento: { type: "varchar(50)", notNull: true },
    contrasena: { type: "varchar(100)", notNull: true },
    activo: { type: "boolean", notNull: true, default: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") }
  });

  pgm.createTable("prospectos", {
    id: "id",
    id_usuarios: {
      type: "integer",
      notNull: true,
      references: '"usuarios"',
      onDelete: "cascade"
    },
    empresa: { type: "varchar(50)", notNull: true },
    direccion: { type: "varchar(100)", notNull: true },
    nombre: { type: "varchar(50)", notNull: true },
    telefono: { type: "varchar(15)", notNull: true },
    extension: { type: "varchar(10)" },
    celular: { type: "varchar(15)", notNull: true },
    correo: { type: "varchar(50)", notNull: true },
    tipo_contacto: { type: "varchar(50)", notNull: true },
    created_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", notNull: true, default: pgm.func("current_timestamp") }
  });

  pgm.createIndex("prospectos", "id_usuarios");
  pgm.createIndex("prospectos", "correo");
}

export async function down(pgm) {
  pgm.dropTable("prospectos");
  pgm.dropTable("usuarios");
}
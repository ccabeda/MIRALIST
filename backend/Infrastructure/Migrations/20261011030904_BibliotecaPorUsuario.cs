using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Miralist.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class BibliotecaPorUsuario : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BibliotecaRevision",
                columns: table => new
                {
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Version = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BibliotecaRevision", x => x.UsuarioId);
                    table.ForeignKey(
                        name: "FK_BibliotecaRevision_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Carpeta",
                columns: table => new
                {
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Id = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false, collation: "Latin1_General_100_BIN2"),
                    Nombre = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Posicion = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Carpeta", x => new { x.UsuarioId, x.Id });
                    table.ForeignKey(
                        name: "FK_Carpeta_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EntradaBiblioteca",
                columns: table => new
                {
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ObraId = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false, collation: "Latin1_General_100_BIN2"),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CapitulosVistos = table.Column<int>(type: "int", nullable: false),
                    Puntuacion = table.Column<int>(type: "int", nullable: false),
                    Favorito = table.Column<bool>(type: "bit", nullable: false),
                    Notas = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    FechaInicio = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    FechaFin = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    FechaVista = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    AgregadoUtc = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    TemporadasJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CatalogoJson = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EntradaBiblioteca", x => new { x.UsuarioId, x.ObraId });
                    table.ForeignKey(
                        name: "FK_EntradaBiblioteca_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ObraEnCarpeta",
                columns: table => new
                {
                    UsuarioId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CarpetaId = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false, collation: "Latin1_General_100_BIN2"),
                    ObraId = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false, collation: "Latin1_General_100_BIN2"),
                    Posicion = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ObraEnCarpeta", x => new { x.UsuarioId, x.CarpetaId, x.ObraId });
                    table.ForeignKey(
                        name: "FK_ObraEnCarpeta_Carpeta_UsuarioId_CarpetaId",
                        columns: x => new { x.UsuarioId, x.CarpetaId },
                        principalTable: "Carpeta",
                        principalColumns: new[] { "UsuarioId", "Id" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ObraEnCarpeta_EntradaBiblioteca_UsuarioId_ObraId",
                        columns: x => new { x.UsuarioId, x.ObraId },
                        principalTable: "EntradaBiblioteca",
                        principalColumns: new[] { "UsuarioId", "ObraId" });
                });

            migrationBuilder.CreateIndex(
                name: "IX_ObraEnCarpeta_UsuarioId_ObraId",
                table: "ObraEnCarpeta",
                columns: new[] { "UsuarioId", "ObraId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BibliotecaRevision");

            migrationBuilder.DropTable(
                name: "ObraEnCarpeta");

            migrationBuilder.DropTable(
                name: "Carpeta");

            migrationBuilder.DropTable(
                name: "EntradaBiblioteca");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LibraryInventory.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Computers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    InventoryNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false, collation: "NOCASE"),
                    Model = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Processor = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    GraphicsCard = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    RamGb = table.Column<int>(type: "INTEGER", nullable: true),
                    Storage = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Motherboard = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    OperatingSystem = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Location = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    AssignedTo = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    CommissionedOn = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Computers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Devices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    InventoryNumber = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false, collation: "NOCASE"),
                    Type = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Manufacturer = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    Model = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    SerialNumber = table.Column<string>(type: "TEXT", maxLength: 150, nullable: true),
                    ComputerId = table.Column<int>(type: "INTEGER", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Devices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Devices_Computers_ComputerId",
                        column: x => x.ComputerId,
                        principalTable: "Computers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Computers_InventoryNumber",
                table: "Computers",
                column: "InventoryNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Devices_ComputerId",
                table: "Devices",
                column: "ComputerId");

            migrationBuilder.CreateIndex(
                name: "IX_Devices_InventoryNumber",
                table: "Devices",
                column: "InventoryNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Devices");

            migrationBuilder.DropTable(
                name: "Computers");
        }
    }
}

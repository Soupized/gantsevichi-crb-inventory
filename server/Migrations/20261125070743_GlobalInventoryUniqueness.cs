using LibraryInventory.Api.Data;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LibraryInventory.Api.Migrations
{
    /// <inheritdoc />
    public partial class GlobalInventoryUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Devices_InventoryNumber",
                table: "Devices");

            migrationBuilder.DropIndex(
                name: "IX_Computers_InventoryNumber",
                table: "Computers");

            migrationBuilder.AlterColumn<string>(
                name: "InventoryNumber",
                table: "Devices",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 50,
                oldCollation: "NOCASE");

            migrationBuilder.AddColumn<string>(
                name: "InventoryNumberKey",
                table: "Devices",
                type: "TEXT",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "InventoryNumber",
                table: "Computers",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 50,
                oldCollation: "NOCASE");

            migrationBuilder.AddColumn<string>(
                name: "InventoryNumberKey",
                table: "Computers",
                type: "TEXT",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(InventoryRegistry.CreateSql);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(InventoryRegistry.DropSql);

            migrationBuilder.DropColumn(
                name: "InventoryNumberKey",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "InventoryNumberKey",
                table: "Computers");

            migrationBuilder.AlterColumn<string>(
                name: "InventoryNumber",
                table: "Devices",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                collation: "NOCASE",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "InventoryNumber",
                table: "Computers",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                collation: "NOCASE",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 50);

            migrationBuilder.CreateIndex(
                name: "IX_Devices_InventoryNumber",
                table: "Devices",
                column: "InventoryNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Computers_InventoryNumber",
                table: "Computers",
                column: "InventoryNumber",
                unique: true);
        }
    }
}

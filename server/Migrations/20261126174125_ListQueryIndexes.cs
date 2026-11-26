using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LibraryInventory.Api.Migrations
{
    /// <inheritdoc />
    public partial class ListQueryIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Devices_InventoryNumber",
                table: "Devices",
                column: "InventoryNumber");

            migrationBuilder.CreateIndex(
                name: "IX_Devices_Status",
                table: "Devices",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Devices_Type",
                table: "Devices",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Computers_InventoryNumber",
                table: "Computers",
                column: "InventoryNumber");

            migrationBuilder.CreateIndex(
                name: "IX_Computers_Status",
                table: "Computers",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Devices_InventoryNumber",
                table: "Devices");

            migrationBuilder.DropIndex(
                name: "IX_Devices_Status",
                table: "Devices");

            migrationBuilder.DropIndex(
                name: "IX_Devices_Type",
                table: "Devices");

            migrationBuilder.DropIndex(
                name: "IX_Computers_InventoryNumber",
                table: "Computers");

            migrationBuilder.DropIndex(
                name: "IX_Computers_Status",
                table: "Computers");
        }
    }
}

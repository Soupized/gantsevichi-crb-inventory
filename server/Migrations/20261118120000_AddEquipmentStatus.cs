using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LibraryInventory.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEquipmentStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Computers",
                type: "TEXT",
                maxLength: 30,
                nullable: false,
                defaultValue: "InUse");

            migrationBuilder.AddColumn<string>(
                name: "DecommissionedOn",
                table: "Computers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DecommissionReason",
                table: "Computers",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Devices",
                type: "TEXT",
                maxLength: 30,
                nullable: false,
                defaultValue: "InUse");

            migrationBuilder.AddColumn<string>(
                name: "DecommissionedOn",
                table: "Devices",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DecommissionReason",
                table: "Devices",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Computers");

            migrationBuilder.DropColumn(
                name: "DecommissionedOn",
                table: "Computers");

            migrationBuilder.DropColumn(
                name: "DecommissionReason",
                table: "Computers");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "DecommissionedOn",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "DecommissionReason",
                table: "Devices");

        }
    }
}

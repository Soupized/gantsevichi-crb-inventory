using LibraryInventory.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace LibraryInventory.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Computer> Computers => Set<Computer>();
    public DbSet<Device> Devices => Set<Device>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Computer>(entity =>
        {
            entity.Property(c => c.InventoryNumber)
                .IsRequired()
                .HasMaxLength(50)
                .UseCollation("NOCASE");
            entity.HasIndex(c => c.InventoryNumber).IsUnique();

            entity.Property(c => c.Model).HasMaxLength(150);
            entity.Property(c => c.Processor).HasMaxLength(200);
            entity.Property(c => c.GraphicsCard).HasMaxLength(200);
            entity.Property(c => c.Storage).HasMaxLength(200);
            entity.Property(c => c.Motherboard).HasMaxLength(200);
            entity.Property(c => c.OperatingSystem).HasMaxLength(150);
            entity.Property(c => c.Location).HasMaxLength(150);
            entity.Property(c => c.AssignedTo).HasMaxLength(150);
            entity.Property(c => c.Notes).HasMaxLength(1000);
        });

        modelBuilder.Entity<Device>(entity =>
        {
            entity.Property(d => d.InventoryNumber)
                .IsRequired()
                .HasMaxLength(50)
                .UseCollation("NOCASE");
            entity.HasIndex(d => d.InventoryNumber).IsUnique();

            entity.Property(d => d.Type).HasConversion<string>().HasMaxLength(30);
            entity.Property(d => d.Manufacturer).HasMaxLength(150);
            entity.Property(d => d.Model).HasMaxLength(150);
            entity.Property(d => d.SerialNumber).HasMaxLength(150);
            entity.Property(d => d.Notes).HasMaxLength(1000);

            entity.HasOne(d => d.Computer)
                .WithMany(c => c.Devices)
                .HasForeignKey(d => d.ComputerId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}

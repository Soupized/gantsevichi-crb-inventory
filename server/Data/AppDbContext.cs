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
                .HasMaxLength(50);
            entity.Property(c => c.InventoryNumberKey)
                .IsRequired()
                .HasMaxLength(200)
                .HasDefaultValue(string.Empty);

            entity.Property(c => c.Model).HasMaxLength(150);
            entity.Property(c => c.Processor).HasMaxLength(200);
            entity.Property(c => c.GraphicsCard).HasMaxLength(200);
            entity.Property(c => c.Storage).HasMaxLength(200);
            entity.Property(c => c.Motherboard).HasMaxLength(200);
            entity.Property(c => c.OperatingSystem).HasMaxLength(150);
            entity.Property(c => c.Location).HasMaxLength(150);
            entity.Property(c => c.AssignedTo).HasMaxLength(150);
            entity.Property(c => c.Status).HasConversion<string>().HasMaxLength(30).HasDefaultValue(EquipmentStatus.InUse);
            entity.Property(c => c.DecommissionReason).HasMaxLength(500);
            entity.Property(c => c.Notes).HasMaxLength(1000);

            entity.HasIndex(c => c.InventoryNumber);
            entity.HasIndex(c => c.Status);
        });

        modelBuilder.Entity<Device>(entity =>
        {
            entity.Property(d => d.InventoryNumber)
                .IsRequired()
                .HasMaxLength(50);
            entity.Property(d => d.InventoryNumberKey)
                .IsRequired()
                .HasMaxLength(200)
                .HasDefaultValue(string.Empty);

            entity.Property(d => d.Type).HasConversion<string>().HasMaxLength(30);
            entity.Property(d => d.Manufacturer).HasMaxLength(150);
            entity.Property(d => d.Model).HasMaxLength(150);
            entity.Property(d => d.SerialNumber).HasMaxLength(150);
            entity.Property(d => d.Status).HasConversion<string>().HasMaxLength(30).HasDefaultValue(EquipmentStatus.InUse);
            entity.Property(d => d.DecommissionReason).HasMaxLength(500);
            entity.Property(d => d.Notes).HasMaxLength(1000);

            entity.HasOne(d => d.Computer)
                .WithMany(c => c.Devices)
                .HasForeignKey(d => d.ComputerId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(d => d.InventoryNumber);
            entity.HasIndex(d => d.ComputerId);
            entity.HasIndex(d => d.Type);
            entity.HasIndex(d => d.Status);
        });
    }

    public override int SaveChanges()
    {
        InventoryNumberGuard.PrepareChanges(this);
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await InventoryNumberGuard.PrepareChangesAsync(this, cancellationToken);
        return await base.SaveChangesAsync(cancellationToken);
    }
}

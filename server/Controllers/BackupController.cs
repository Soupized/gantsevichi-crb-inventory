using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;

namespace LibraryInventory.Api.Controllers;

[ApiController]
[Route("api/backup")]
public class BackupController(IConfiguration configuration, IWebHostEnvironment env) : ControllerBase
{
    [HttpGet("download")]
    public async Task<IActionResult> Download()
    {
        var dbPath = GetDatabasePath();
        if (!System.IO.File.Exists(dbPath))
        {
            return NotFound(new { message = "???? ???? ?????? ?? ??????." });
        }

        var tempPath = Path.Combine(Path.GetTempPath(), $"library-backup-{Guid.NewGuid():N}.db");
        try
        {
            await CreateConsistentCopyAsync(dbPath, tempPath);
            var bytes = await System.IO.File.ReadAllBytesAsync(tempPath);
            var name = $"library-backup-{DateTime.Now:yyyyMMdd-HHmmss}.db";
            return File(bytes, "application/octet-stream", name);
        }
        finally
        {
            TryDelete(tempPath);
        }
    }

    [HttpPost("restore")]
    [RequestSizeLimit(200 * 1024 * 1024)]
    public async Task<IActionResult> Restore(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "???????? ???? ????????? ????? (.db, .sqlite)." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not ".db" and not ".sqlite" and not ".sqlite3")
        {
            return BadRequest(new { message = "?????????????? ?????? ????? SQLite (.db, .sqlite, .sqlite3)." });
        }

        var dbPath = GetDatabasePath();
        var tempUpload = Path.Combine(Path.GetTempPath(), $"library-restore-{Guid.NewGuid():N}{ext}");
        var backupBefore = Path.Combine(Path.GetTempPath(), $"library-before-restore-{Guid.NewGuid():N}.db");

        try
        {
            await using (var stream = System.IO.File.Create(tempUpload))
            {
                await file.CopyToAsync(stream);
            }

            if (!await LooksLikeSqliteAsync(tempUpload))
            {
                return BadRequest(new { message = "??????????? ???? ?? ???????? ????? ?????? SQLite." });
            }

            if (System.IO.File.Exists(dbPath))
            {
                try
                {
                    await CreateConsistentCopyAsync(dbPath, backupBefore);
                }
                catch
                {
                    System.IO.File.Copy(dbPath, backupBefore, overwrite: true);
                }
            }

            SqliteConnection.ClearAllPools();

            var directory = Path.GetDirectoryName(dbPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }

            System.IO.File.Copy(tempUpload, dbPath, overwrite: true);
            TryDelete(dbPath + "-wal");
            TryDelete(dbPath + "-shm");

            return Ok(new
            {
                message = "???? ?????? ????????????? ?? ????????? ?????. ???????? ????????, ????? ??????? ?????????? ??????."
            });
        }
        catch (Exception ex)
        {
            try
            {
                if (System.IO.File.Exists(backupBefore))
                {
                    SqliteConnection.ClearAllPools();
                    System.IO.File.Copy(backupBefore, dbPath, overwrite: true);
                }
            }
            catch { }

            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "?? ??????? ???????????? ???? ??????.", detail = ex.Message });
        }
        finally
        {
            TryDelete(tempUpload);
            TryDelete(backupBefore);
        }
    }

    private string GetDatabasePath()
    {
        var cs = configuration.GetConnectionString("Default") ?? "Data Source=library.db;Foreign Keys=True";
        var builder = new SqliteConnectionStringBuilder(cs);
        var dataSource = builder.DataSource;
        if (string.IsNullOrWhiteSpace(dataSource))
        {
            dataSource = "library.db";
        }

        return Path.IsPathRooted(dataSource)
            ? Path.GetFullPath(dataSource)
            : Path.GetFullPath(Path.Combine(env.ContentRootPath, dataSource));
    }

    private static async Task CreateConsistentCopyAsync(string sourcePath, string destinationPath)
    {
        var cs = new SqliteConnectionStringBuilder { DataSource = sourcePath, Mode = SqliteOpenMode.ReadOnly };
        await using var source = new SqliteConnection(cs.ToString());
        await source.OpenAsync();

        try
        {
            await using (var cmd = source.CreateCommand())
            {
                cmd.CommandText = "PRAGMA wal_checkpoint(FULL);";
                await cmd.ExecuteNonQueryAsync();
            }
        }
        catch { }

        await using var dest = new SqliteConnection($"Data Source={destinationPath}");
        await dest.OpenAsync();
        source.BackupDatabase(dest);
    }

    private static async Task<bool> LooksLikeSqliteAsync(string path)
    {
        try
        {
            var header = new byte[16];
            await using var fs = System.IO.File.OpenRead(path);
            var read = await fs.ReadAsync(header.AsMemory(0, 16));
            if (read < 16) return false;
            var text = System.Text.Encoding.ASCII.GetString(header);
            return text.StartsWith("SQLite format 3", StringComparison.Ordinal);
        }
        catch
        {
            return false;
        }
    }

    private static void TryDelete(string path)
    {
        try
        {
            if (System.IO.File.Exists(path))
            {
                System.IO.File.Delete(path);
            }
        }
        catch { }
    }
}

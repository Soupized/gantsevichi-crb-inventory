using System.Security.Cryptography;
using System.Text;

namespace LibraryInventory.Api.Auth;

public sealed class AppPassword
{
    public const string EnvironmentVariable = "INVENTORY_PASSWORD";
    public const string PasswordFileName = "auth-password.txt";

    public string Value { get; }

    public AppPassword(IWebHostEnvironment environment)
    {
        var configured = Environment.GetEnvironmentVariable(EnvironmentVariable);
        if (!string.IsNullOrWhiteSpace(configured))
        {
            Value = configured.Trim();
            return;
        }

        var path = Path.Combine(environment.ContentRootPath, PasswordFileName);
        if (File.Exists(path))
        {
            var stored = File.ReadAllText(path).Trim();
            if (stored.Length > 0)
            {
                Value = stored;
                return;
            }
        }

        Value = Generate();
        File.WriteAllText(path, Value, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
    }

    private static string Generate()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        var chars = new char[16];

        for (var index = 0; index < chars.Length; index++)
        {
            chars[index] = alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];
        }

        return new string(chars);
    }
}

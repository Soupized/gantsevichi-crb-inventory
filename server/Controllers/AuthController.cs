using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LibraryInventory.Api.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LibraryInventory.Api.Controllers;

public sealed class LoginInput
{
    [Required(ErrorMessage = "Укажите пароль")]
    public string? Password { get; set; }
}

[ApiController]
[Route("api/auth")]
public class AuthController(AppPassword appPassword) : ControllerBase
{
    [HttpGet("status")]
    [AllowAnonymous]
    public IActionResult Status()
    {
        var authenticated = User.Identity?.IsAuthenticated == true;
        return Ok(new
        {
            authenticated,
            user = authenticated ? User.Identity?.Name : null
        });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginInput input)
    {
        if (!Matches(input.Password, appPassword.Value))
        {
            return Unauthorized(new { message = "Неверный пароль доступа." });
        }

        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, "admin")],
            CookieAuthenticationDefaults.AuthenticationScheme);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties
            {
                IsPersistent = true,
                AllowRefresh = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddHours(12)
            });

        return Ok(new { authenticated = true, user = "admin" });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok(new { authenticated = false });
    }

    private static bool Matches(string? supplied, string expected)
    {
        if (supplied is null)
        {
            return false;
        }

        var left = SHA256.HashData(Encoding.UTF8.GetBytes(supplied));
        var right = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        return CryptographicOperations.FixedTimeEquals(left, right);
    }
}

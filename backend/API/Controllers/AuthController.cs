using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Miralist.Application.DTOs.Auth;
using Miralist.Application.IHandlers;
using Miralist.Application.UseCases.Auth.Commands;
using Miralist.Application.UseCases.Auth.Queries;

namespace Miralist.API.Controllers;

[ApiController, Route("api/auth")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AuthController(IRegistrarUsuarioHandler registrar, IIniciarSesionHandler login,
    IUsuarioActualHandler actual, ICerrarSesionHandler logout, IAntiforgery antiforgery) : ControllerBase
{
    [HttpGet("csrf"), AllowAnonymous]
    public IActionResult Csrf() => Ok(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });

    [HttpPost("register"), AllowAnonymous, EnableRateLimiting("auth")]
    public async Task<ActionResult<UsuarioDto>> Register(RegistroDto request, CancellationToken ct)
    {
        var sesion = await registrar.Handle(new(request), ct);
        await SignIn(sesion);
        return StatusCode(201, sesion.Usuario);
    }

    [HttpPost("login"), AllowAnonymous, EnableRateLimiting("auth")]
    public async Task<ActionResult<UsuarioDto>> Login(LoginDto request, CancellationToken ct)
    {
        var sesion = await login.Handle(new(request), ct);
        await SignIn(sesion);
        return Ok(sesion.Usuario);
    }

    [HttpGet("me"), Authorize]
    public async Task<ActionResult<UsuarioDto>> Me(CancellationToken ct)
    {
        var usuario = await actual.Handle(new(Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!)), ct);
        return usuario is null ? Unauthorized() : Ok(usuario);
    }

    [HttpPost("logout"), Authorize]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        await logout.Handle(new(Guid.Parse(User.FindFirstValue("sid")!)), ct);
        await HttpContext.SignOutAsync();
        return NoContent();
    }

    private Task SignIn(SesionDto sesion)
    {
        var identity = new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, sesion.Usuario.Id.ToString()),
            new Claim("sid", sesion.SesionId.ToString())
        ], CookieAuthenticationDefaults.AuthenticationScheme);
        return HttpContext.SignInAsync(new ClaimsPrincipal(identity), new AuthenticationProperties
        {
            IsPersistent = true, ExpiresUtc = new DateTimeOffset(sesion.ExpiraUtc, TimeSpan.Zero), AllowRefresh = false
        });
    }
}

using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Miralist.Application.DTOs.Auth;
using Miralist.Application.Exceptions;
using Miralist.Application.UseCases.Auth.Handlers;

namespace Miralist.API.Controllers;

[ApiController, Route("api/auth"), EnableRateLimiting("account")]
public class CuentaController(CuentaHandler cuenta, RecuperacionHandler recuperacion) : ControllerBase
{
    private Guid UsuarioId()
    {
        var id = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (!Guid.TryParse(Request.Headers["X-Miralist-User"], out var expected) || expected != id)
            throw new AuthException(409, "La sesión cambió. Volvé a iniciar sesión antes de editar esta cuenta.");
        return id;
    }

    [HttpPost("profile"), Authorize]
    public async Task<ActionResult<UsuarioDto>> Profile(EditarPerfilDto datos, CancellationToken ct) =>
        Ok(await cuenta.Editar(UsuarioId(), datos, ct));

    [HttpPost("change-password"), Authorize]
    public async Task<IActionResult> ChangePassword(CambiarPasswordDto datos, CancellationToken ct)
    {
        await cuenta.CambiarPassword(UsuarioId(), datos, ct);
        await HttpContext.SignOutAsync();
        return NoContent();
    }

    [HttpPost("logout-all"), Authorize]
    public async Task<IActionResult> LogoutAll(CancellationToken ct)
    {
        await cuenta.CerrarSesiones(UsuarioId(), ct);
        await HttpContext.SignOutAsync();
        return NoContent();
    }

    [HttpPost("forgot-password"), AllowAnonymous]
    public async Task<IActionResult> Forgot(SolicitarRecuperacionDto datos, CancellationToken ct)
    {
        await recuperacion.Solicitar(datos, ct);
        return Ok(new { message = "Si el correo corresponde a una cuenta, recibirás un enlace. Revisá también spam; si no llega, intentá más tarde." });
    }

    [HttpPost("reset-password"), AllowAnonymous]
    public async Task<IActionResult> Reset(RestablecerPasswordDto datos, CancellationToken ct)
    {
        await recuperacion.Restablecer(datos, ct);
        await HttpContext.SignOutAsync();
        return NoContent();
    }
}

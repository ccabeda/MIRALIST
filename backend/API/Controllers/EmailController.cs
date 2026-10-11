using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Miralist.Application.Exceptions;
using Miralist.Application.UseCases.Auth.Handlers;

namespace Miralist.API.Controllers;

public record ConfirmarEmailDto([Required, RegularExpression("^[a-fA-F0-9]{64}$")] string Token);

[ApiController, Route("api/auth"), EnableRateLimiting("account")]
public class EmailController(VerificacionEmailHandler verificacion) : ControllerBase
{
    [HttpPost("resend-verification"), Authorize]
    public async Task<IActionResult> Reenviar(CancellationToken ct)
    {
        var id = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (!Guid.TryParse(Request.Headers["X-Miralist-User"], out var expected) || expected != id)
            throw new AuthException(409, "La sesión cambió. Volvé a iniciar sesión.");
        await verificacion.Solicitar(id, ct);
        return Ok(new { message = "Revisá tu correo y la carpeta de spam." });
    }

    [HttpPost("verify-email"), AllowAnonymous]
    public async Task<IActionResult> Confirmar(ConfirmarEmailDto datos, CancellationToken ct)
    {
        await verificacion.Confirmar(datos.Token, ct);
        return Ok(new { message = "Correo verificado. Si cambiaste de dirección, iniciá sesión con el nuevo correo." });
    }
}

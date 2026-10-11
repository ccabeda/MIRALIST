using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Miralist.Application.DTOs.Biblioteca;
using Miralist.Application.UseCases.Biblioteca;

namespace Miralist.API.Controllers;

[ApiController, Authorize, Route("api/library")]
public class BibliotecaController(ObtenerBibliotecaHandler obtener, GuardarBibliotecaHandler guardar) : ControllerBase
{
    private Guid UsuarioId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool MismaCuenta => Guid.TryParse(Request.Headers["X-Miralist-User"], out var id) && id == UsuarioId;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) => MismaCuenta
        ? Ok(await obtener.Handle(new(UsuarioId), ct)) : Conflict(new { title = "La sesión cambió. Volvé a iniciar sesión.", code = "account_changed" });

    [HttpPut, RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> Put(ColeccionDto data, CancellationToken ct) => MismaCuenta
        ? Ok(new { version = await guardar.Handle(new(UsuarioId, data), ct) })
        : Conflict(new { title = "La sesión cambió. Volvé a iniciar sesión.", code = "account_changed" });
}

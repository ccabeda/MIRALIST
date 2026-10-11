using Miralist.Application.DTOs.Auth;
using Miralist.Application.IRepository;
using Miralist.Domain.Models;

namespace Miralist.Application.UseCases.Auth.Handlers;

public class CrearSesion(ISesionRepository sesiones, TimeProvider clock)
{
    public async Task<SesionDto> Para(Usuario usuario, CancellationToken ct)
    {
        var sesion = new Sesion { UsuarioId = usuario.Id, ExpiraUtc = clock.GetUtcNow().UtcDateTime.AddHours(12) };
        await sesiones.Agregar(sesion, usuario.PasswordHash, ct);
        return new(new(usuario.Id, usuario.Nombre, usuario.Email, usuario.EmailVerificado, usuario.EmailPendiente), sesion.Id, sesion.ExpiraUtc);
    }
}

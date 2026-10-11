using Miralist.Domain.Models;

namespace Miralist.Application.IRepository;

public interface ICuentaRepository
{
    Task EditarPerfil(Guid usuarioId, string hashActual, string nombre, string email, CancellationToken ct);
    Task CambiarPassword(Guid usuarioId, string hashActual, string hashNuevo, CancellationToken ct);
    Task CerrarSesiones(Guid usuarioId, CancellationToken ct);
    Task<bool> CrearRecuperacion(Usuario usuario, RecuperacionPassword recuperacion, CancellationToken ct);
    Task<RecuperacionPassword?> BuscarRecuperacion(string tokenHash, CancellationToken ct);
    Task RestablecerPassword(RecuperacionPassword recuperacion, DateTime ahora, string hashNuevo, CancellationToken ct);
    Task EliminarRecuperacion(string tokenHash, CancellationToken ct);
}

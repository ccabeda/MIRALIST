using Miralist.Domain.Models;

namespace Miralist.Application.IRepository;

public interface ISesionRepository
{
    Task Agregar(Sesion sesion, string passwordHashEsperado, CancellationToken ct);
    Task<bool> EsValida(Guid id, Guid usuarioId, DateTime ahoraUtc, CancellationToken ct);
    Task Revocar(Guid id, CancellationToken ct);
}

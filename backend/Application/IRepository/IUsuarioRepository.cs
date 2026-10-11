using Miralist.Domain.Models;

namespace Miralist.Application.IRepository;

public interface IUsuarioRepository
{
    Task<Usuario?> PorEmail(string normalizado, CancellationToken ct);
    Task<Usuario?> PorId(Guid id, CancellationToken ct);
    Task Agregar(Usuario usuario, CancellationToken ct);
    Task Guardar(CancellationToken ct);
}

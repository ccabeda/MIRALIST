using Miralist.Application.DTOs.Biblioteca;

namespace Miralist.Application.IRepository;

public interface IBibliotecaRepository
{
    Task<ColeccionDto> Obtener(Guid usuarioId, CancellationToken ct);
    Task<Guid> Guardar(Guid usuarioId, ColeccionDto coleccion, CancellationToken ct);
}

using Miralist.Domain.Models;

namespace Miralist.Application.IRepository;

public interface IVerificacionEmailRepository
{
    Task<bool> Crear(Usuario usuario, VerificacionEmail token, CancellationToken ct);
    Task Confirmar(string hash, DateTime ahora, CancellationToken ct);
    Task Eliminar(string hash, CancellationToken ct);
}

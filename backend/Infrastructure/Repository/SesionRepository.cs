using Microsoft.EntityFrameworkCore;
using System.Data;
using Miralist.Application.Exceptions;
using Miralist.Application.IRepository;
using Miralist.Domain.Models;
using Miralist.Infrastructure.Persistence;

namespace Miralist.Infrastructure.Repository;

public class SesionRepository(MiralistDbContext db) : ISesionRepository
{
    public async Task Agregar(Sesion sesion, string passwordHashEsperado, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT Id FROM Usuarios WITH (UPDLOCK, HOLDLOCK) WHERE Id = {sesion.UsuarioId}", ct);
        if (!await db.Usuarios.AnyAsync(x => x.Id == sesion.UsuarioId && x.PasswordHash == passwordHashEsperado, ct))
            throw new AuthException(401, "La contraseña cambió. Volvé a iniciar sesión.");
        await db.Sesiones.Where(x => x.UsuarioId == sesion.UsuarioId && x.ExpiraUtc <= DateTime.UtcNow).ExecuteDeleteAsync(ct);
        db.Sesiones.Add(sesion);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
    public Task<bool> EsValida(Guid id, Guid usuarioId, DateTime ahoraUtc, CancellationToken ct) =>
        db.Sesiones.AnyAsync(x => x.Id == id && x.UsuarioId == usuarioId && x.ExpiraUtc > ahoraUtc, ct);
    public async Task Revocar(Guid id, CancellationToken ct) =>
        await db.Sesiones.Where(x => x.Id == id).ExecuteDeleteAsync(ct);
}

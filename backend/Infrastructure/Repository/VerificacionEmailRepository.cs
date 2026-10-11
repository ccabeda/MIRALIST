using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Miralist.Application.Exceptions;
using Miralist.Application.IRepository;
using Miralist.Domain.Models;
using Miralist.Infrastructure.Persistence;

namespace Miralist.Infrastructure.Repository;

public class VerificacionEmailRepository(MiralistDbContext db) : IVerificacionEmailRepository
{
    private Task Bloquear(Guid id, CancellationToken ct) => db.Database.ExecuteSqlInterpolatedAsync(
        $"SELECT Id FROM Usuarios WITH (UPDLOCK, HOLDLOCK) WHERE Id = {id}", ct);

    public async Task<bool> Crear(Usuario usuario, VerificacionEmail token, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await Bloquear(usuario.Id, ct);
        var actual = await db.Usuarios.AsNoTracking().SingleAsync(x => x.Id == usuario.Id, ct);
        if (actual.PasswordHash != usuario.PasswordHash || actual.EmailPendiente != usuario.EmailPendiente
            || actual.EmailNormalizado != usuario.EmailNormalizado || actual.EmailVerificado && actual.EmailPendiente is null) return false;
        var anteriores = db.Set<VerificacionEmail>().Where(x => x.UsuarioId == usuario.Id);
        if (await anteriores.AnyAsync(x => x.CreadoUtc > token.CreadoUtc.AddMinutes(-1), ct)) return false;
        await anteriores.ExecuteDeleteAsync(ct);
        db.Add(token);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return true;
    }

    public async Task Confirmar(string hash, DateTime ahora, CancellationToken ct)
    {
        var token = await db.Set<VerificacionEmail>().AsNoTracking().SingleOrDefaultAsync(x => x.TokenHash == hash, ct);
        if (token is null) throw Invalido();
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await Bloquear(token.UsuarioId, ct);
        if (!await db.Set<VerificacionEmail>().AnyAsync(x => x.TokenHash == hash && x.ExpiraUtc > ahora, ct)) throw Invalido();
        var usuario = await db.Usuarios.AsNoTracking().SingleAsync(x => x.Id == token.UsuarioId, ct);
        if ((usuario.EmailPendiente ?? usuario.Email) != token.Email) throw Invalido();
        var normalizado = token.Email.ToUpperInvariant();
        try
        {
            await db.Usuarios.Where(x => x.Id == usuario.Id).ExecuteUpdateAsync(s => s
                .SetProperty(x => x.Email, token.Email).SetProperty(x => x.EmailNormalizado, normalizado)
                .SetProperty(x => x.EmailVerificado, true).SetProperty(x => x.EmailPendiente, (string?)null), ct);
        }
        catch (SqlException ex) when (ex.Number is 2601 or 2627)
        { throw new AuthException(409, "Ese correo ya pertenece a otra cuenta. Elegí otro desde tu perfil."); }
        await db.Set<VerificacionEmail>().Where(x => x.UsuarioId == usuario.Id).ExecuteDeleteAsync(ct);
        if (usuario.EmailNormalizado != normalizado)
        {
            await db.Set<RecuperacionPassword>().Where(x => x.UsuarioId == usuario.Id).ExecuteDeleteAsync(ct);
            await db.Sesiones.Where(x => x.UsuarioId == usuario.Id).ExecuteDeleteAsync(ct);
        }
        await tx.CommitAsync(ct);
    }

    private static AuthException Invalido() => new(400, "El enlace es inválido o venció. Pedí uno nuevo desde tu perfil.");
    public async Task Eliminar(string hash, CancellationToken ct) =>
        await db.Set<VerificacionEmail>().Where(x => x.TokenHash == hash).ExecuteDeleteAsync(ct);
}

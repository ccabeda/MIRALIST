using System.Data;
using Microsoft.EntityFrameworkCore;
using Miralist.Application.Exceptions;
using Miralist.Application.IRepository;
using Miralist.Domain.Models;
using Miralist.Infrastructure.Persistence;

namespace Miralist.Infrastructure.Repository;

public class CuentaRepository(MiralistDbContext db) : ICuentaRepository
{
    private Task Bloquear(Guid usuarioId, CancellationToken ct) =>
        db.Database.ExecuteSqlInterpolatedAsync($"SELECT Id FROM Usuarios WITH (UPDLOCK, HOLDLOCK) WHERE Id = {usuarioId}", ct);

    private async Task<Usuario> Actual(Guid id, string hash, CancellationToken ct)
    {
        var usuario = await db.Usuarios.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (usuario is null || usuario.PasswordHash != hash)
            throw new AuthException(409, "La cuenta cambió. Volvé a iniciar sesión.");
        return usuario;
    }

    public async Task EditarPerfil(Guid usuarioId, string hashActual, string nombre, string email, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await Bloquear(usuarioId, ct);
        var usuario = await Actual(usuarioId, hashActual, ct);
        var normalizado = email.ToUpperInvariant();
        if (await db.Usuarios.AnyAsync(x => x.Id != usuarioId && x.EmailNormalizado == normalizado, ct))
            throw new AuthException(409, "No se pudo usar esa dirección de correo.");
        var pendiente = usuario.EmailNormalizado == normalizado ? null : email;
        await db.Usuarios.Where(x => x.Id == usuarioId).ExecuteUpdateAsync(set => set
            .SetProperty(x => x.Nombre, nombre).SetProperty(x => x.EmailPendiente, pendiente), ct);
        if (usuario.EmailPendiente != pendiente)
        {
            await db.Set<VerificacionEmail>().Where(x => x.UsuarioId == usuarioId).ExecuteDeleteAsync(ct);
        }
        await transaction.CommitAsync(ct);
    }

    public async Task CambiarPassword(Guid usuarioId, string hashActual, string hashNuevo, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await Bloquear(usuarioId, ct);
        await Actual(usuarioId, hashActual, ct);
        await ReemplazarPassword(usuarioId, hashNuevo, ct);
        await transaction.CommitAsync(ct);
    }

    private async Task ReemplazarPassword(Guid id, string hash, CancellationToken ct)
    {
        await db.Usuarios.Where(x => x.Id == id).ExecuteUpdateAsync(set => set
            .SetProperty(x => x.PasswordHash, hash).SetProperty(x => x.IntentosFallidos, 0)
            .SetProperty(x => x.BloqueadoHastaUtc, (DateTime?)null), ct);
        await db.Sesiones.Where(x => x.UsuarioId == id).ExecuteDeleteAsync(ct);
        await db.Set<RecuperacionPassword>().Where(x => x.UsuarioId == id).ExecuteDeleteAsync(ct);
        await db.Set<VerificacionEmail>().Where(x => x.UsuarioId == id).ExecuteDeleteAsync(ct);
        await db.Usuarios.Where(x => x.Id == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.EmailPendiente, (string?)null), ct);
    }

    public async Task CerrarSesiones(Guid usuarioId, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await Bloquear(usuarioId, ct);
        await db.Sesiones.Where(x => x.UsuarioId == usuarioId).ExecuteDeleteAsync(ct);
        await transaction.CommitAsync(ct);
    }

    public async Task<bool> CrearRecuperacion(Usuario usuario, RecuperacionPassword recuperacion, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await Bloquear(usuario.Id, ct);
        var actual = await db.Usuarios.AsNoTracking().SingleOrDefaultAsync(x => x.Id == usuario.Id, ct);
        if (actual is null || actual.PasswordHash != usuario.PasswordHash || actual.EmailNormalizado != usuario.EmailNormalizado) return false;
        var tokens = db.Set<RecuperacionPassword>().Where(x => x.UsuarioId == usuario.Id);
        var limite = recuperacion.CreadoUtc.AddMinutes(-1);
        if (await tokens.AnyAsync(x => x.CreadoUtc > limite, ct)) return false;
        await tokens.ExecuteDeleteAsync(ct);
        db.Add(recuperacion);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return true;
    }

    public Task<RecuperacionPassword?> BuscarRecuperacion(string tokenHash, CancellationToken ct) =>
        db.Set<RecuperacionPassword>().AsNoTracking().SingleOrDefaultAsync(x => x.TokenHash == tokenHash, ct);

    public async Task RestablecerPassword(RecuperacionPassword recuperacion, DateTime ahora, string hashNuevo, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await Bloquear(recuperacion.UsuarioId, ct);
        if (!await db.Set<RecuperacionPassword>().AnyAsync(x => x.TokenHash == recuperacion.TokenHash
            && x.UsuarioId == recuperacion.UsuarioId && x.ExpiraUtc > ahora, ct))
            throw new AuthException(400, "El enlace es inválido o venció. Pedí uno nuevo.");
        await ReemplazarPassword(recuperacion.UsuarioId, hashNuevo, ct);
        await transaction.CommitAsync(ct);
    }

    public async Task EliminarRecuperacion(string tokenHash, CancellationToken ct) =>
        await db.Set<RecuperacionPassword>().Where(x => x.TokenHash == tokenHash).ExecuteDeleteAsync(ct);
}

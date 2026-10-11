using System.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Miralist.Application.DTOs.Biblioteca;
using Miralist.Application.Exceptions;
using Miralist.Application.IRepository;
using Miralist.Domain.Models;
using Miralist.Infrastructure.Persistence;

namespace Miralist.Infrastructure.Repository;

public class BibliotecaRepository(MiralistDbContext db) : IBibliotecaRepository
{
    public async Task<ColeccionDto> Obtener(Guid usuarioId, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT Id FROM Usuarios WITH (UPDLOCK, HOLDLOCK) WHERE Id = {usuarioId}", ct);
        var revision = await db.Set<BibliotecaRevision>().AsNoTracking().SingleOrDefaultAsync(x => x.UsuarioId == usuarioId, ct);
        var entries = await db.Set<EntradaBiblioteca>().AsNoTracking().Where(x => x.UsuarioId == usuarioId).ToListAsync(ct);
        var folders = await db.Set<Carpeta>().AsNoTracking().Include(x => x.Obras)
            .Where(x => x.UsuarioId == usuarioId).OrderBy(x => x.Posicion).ToListAsync(ct);
        await transaction.CommitAsync(ct);
        return new ColeccionDto
        {
            Version = revision?.Version ?? Guid.Empty,
            Library = entries.ToDictionary(x => x.ObraId, x => new EntradaDto
            {
                Status = x.Estado, Progress = x.CapitulosVistos, Score = x.Puntuacion, Favorite = x.Favorito,
                Notes = x.Notas, StartDate = x.FechaInicio, FinishDate = x.FechaFin, WatchedDate = x.FechaVista,
                AddedAt = x.AgregadoUtc, Catalog = JsonSerializer.Deserialize<JsonElement>(x.CatalogoJson),
                SeasonProgress = x.TemporadasJson is null ? null : JsonSerializer.Deserialize<Dictionary<string, int>>(x.TemporadasJson)
            }),
            Folders = folders.Select(x => new CarpetaDto
            {
                Id = x.Id, Name = x.Nombre, TitleIds = x.Obras.OrderBy(y => y.Posicion).Select(y => y.ObraId).ToList()
            }).ToList()
        };
    }

    public async Task<Guid> Guardar(Guid usuarioId, ColeccionDto coleccion, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        // Serialize writes for this account, including its first collection, without locking other accounts.
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT Id FROM Usuarios WITH (UPDLOCK, HOLDLOCK) WHERE Id = {usuarioId}", ct);
        var revision = await db.Set<BibliotecaRevision>().SingleOrDefaultAsync(x => x.UsuarioId == usuarioId, ct);
        if ((revision?.Version ?? Guid.Empty) != coleccion.Version)
            throw new AuthException(409, "La biblioteca cambió en otra pestaña o dispositivo. Revisá los cambios antes de guardar.");
        await db.Set<ObraEnCarpeta>().Where(x => x.UsuarioId == usuarioId).ExecuteDeleteAsync(ct);
        await db.Set<Carpeta>().Where(x => x.UsuarioId == usuarioId).ExecuteDeleteAsync(ct);
        await db.Set<EntradaBiblioteca>().Where(x => x.UsuarioId == usuarioId).ExecuteDeleteAsync(ct);
        foreach (var (id, entry) in coleccion.Library)
            db.Add(new EntradaBiblioteca
            {
                UsuarioId = usuarioId, ObraId = id, Estado = entry.Status, CapitulosVistos = entry.Progress,
                Puntuacion = entry.Score, Favorito = entry.Favorite, Notas = entry.Notes,
                FechaInicio = entry.StartDate, FechaFin = entry.FinishDate, FechaVista = entry.WatchedDate,
                AgregadoUtc = entry.AddedAt, CatalogoJson = entry.Catalog.GetRawText(),
                TemporadasJson = entry.SeasonProgress is null ? null : JsonSerializer.Serialize(entry.SeasonProgress)
            });
        for (var position = 0; position < coleccion.Folders.Count; position++)
        {
            var folder = coleccion.Folders[position];
            db.Add(new Carpeta
            {
                UsuarioId = usuarioId, Id = folder.Id, Nombre = folder.Name, Posicion = position,
                Obras = folder.TitleIds.Select((id, index) => new ObraEnCarpeta
                { UsuarioId = usuarioId, CarpetaId = folder.Id, ObraId = id, Posicion = index }).ToList()
            });
        }
        if (revision is null) { revision = new BibliotecaRevision { UsuarioId = usuarioId }; db.Add(revision); }
        revision.Version = Guid.NewGuid();
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return revision.Version;
    }
}

using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Miralist.Application.Exceptions;
using Miralist.Application.IRepository;
using Miralist.Domain.Models;
using Miralist.Infrastructure.Persistence;

namespace Miralist.Infrastructure.Repository;

public class UsuarioRepository(MiralistDbContext db) : IUsuarioRepository
{
    public Task<Usuario?> PorEmail(string email, CancellationToken ct) =>
        db.Usuarios.SingleOrDefaultAsync(x => x.EmailNormalizado == email, ct);
    public Task<Usuario?> PorId(Guid id, CancellationToken ct) =>
        db.Usuarios.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
    public async Task Agregar(Usuario usuario, CancellationToken ct)
    {
        db.Usuarios.Add(usuario);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            throw new AuthException(409, "No se pudo registrar esa dirección de correo.");
        }
    }
    public async Task Guardar(CancellationToken ct) => await db.SaveChangesAsync(ct);
}

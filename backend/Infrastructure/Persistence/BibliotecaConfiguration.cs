using Microsoft.EntityFrameworkCore;
using Miralist.Domain.Models;

namespace Miralist.Infrastructure.Persistence;

public static class BibliotecaConfiguration
{
    public static void Configure(ModelBuilder builder)
    {
        var revision = builder.Entity<BibliotecaRevision>();
        revision.HasKey(x => x.UsuarioId);
        revision.HasOne<Usuario>().WithOne().HasForeignKey<BibliotecaRevision>(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade);
        var entry = builder.Entity<EntradaBiblioteca>();
        entry.HasKey(x => new { x.UsuarioId, x.ObraId });
        entry.Property(x => x.ObraId).HasMaxLength(150).UseCollation("Latin1_General_100_BIN2");
        entry.Property(x => x.Estado).HasMaxLength(20);
        entry.Property(x => x.Notas).HasMaxLength(2000);
        entry.Property(x => x.FechaInicio).HasMaxLength(10);
        entry.Property(x => x.FechaFin).HasMaxLength(10);
        entry.Property(x => x.FechaVista).HasMaxLength(10);
        entry.Property(x => x.AgregadoUtc).HasMaxLength(50);
        entry.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade);
        var folder = builder.Entity<Carpeta>();
        folder.HasKey(x => new { x.UsuarioId, x.Id });
        folder.Property(x => x.Id).HasMaxLength(150).UseCollation("Latin1_General_100_BIN2");
        folder.Property(x => x.Nombre).HasMaxLength(60);
        folder.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade);
        var item = builder.Entity<ObraEnCarpeta>();
        item.HasKey(x => new { x.UsuarioId, x.CarpetaId, x.ObraId });
        item.Property(x => x.CarpetaId).HasMaxLength(150).UseCollation("Latin1_General_100_BIN2");
        item.Property(x => x.ObraId).HasMaxLength(150).UseCollation("Latin1_General_100_BIN2");
        item.HasOne<Carpeta>().WithMany(x => x.Obras).HasForeignKey(x => new { x.UsuarioId, x.CarpetaId }).OnDelete(DeleteBehavior.Cascade);
        item.HasOne<EntradaBiblioteca>().WithMany().HasForeignKey(x => new { x.UsuarioId, x.ObraId }).OnDelete(DeleteBehavior.NoAction);
    }
}

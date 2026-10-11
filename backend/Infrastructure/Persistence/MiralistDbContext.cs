using Microsoft.EntityFrameworkCore;
using Miralist.Domain.Models;

namespace Miralist.Infrastructure.Persistence;

public class MiralistDbContext(DbContextOptions<MiralistDbContext> options) : DbContext(options)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Sesion> Sesiones => Set<Sesion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        BibliotecaConfiguration.Configure(modelBuilder);
        var usuario = modelBuilder.Entity<Usuario>();
        usuario.HasKey(x => x.Id);
        usuario.Property(x => x.Nombre).HasMaxLength(40).IsRequired();
        usuario.Property(x => x.Email).HasMaxLength(254).IsRequired();
        usuario.Property(x => x.EmailNormalizado).HasMaxLength(254).IsRequired();
        usuario.Property(x => x.EmailPendiente).HasMaxLength(254);
        usuario.Property(x => x.PasswordHash).IsRequired();
        usuario.HasIndex(x => x.EmailNormalizado).IsUnique();
        var sesion = modelBuilder.Entity<Sesion>();
        sesion.HasKey(x => x.Id);
        sesion.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade);
        sesion.HasIndex(x => x.ExpiraUtc);
        var recuperacion = modelBuilder.Entity<RecuperacionPassword>();
        recuperacion.HasKey(x => x.TokenHash);
        recuperacion.Property(x => x.TokenHash).HasMaxLength(64).IsUnicode(false);
        recuperacion.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade);
        recuperacion.HasIndex(x => x.UsuarioId).IsUnique();
        var verificacion = modelBuilder.Entity<VerificacionEmail>();
        verificacion.HasKey(x => x.TokenHash);
        verificacion.Property(x => x.TokenHash).HasMaxLength(64).IsUnicode(false);
        verificacion.Property(x => x.Email).HasMaxLength(254).IsRequired();
        verificacion.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade);
        verificacion.HasIndex(x => x.UsuarioId).IsUnique();
    }
}

using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Miralist.Application.Security;
using Miralist.Domain.Models;

namespace Miralist.Infrastructure.Security;

public class PasswordService : IPasswordService
{
    private readonly PasswordHasher<Usuario> hasher = new(Options.Create(new PasswordHasherOptions { IterationCount = 600_000 }));
    private readonly Usuario dummy = new();
    private readonly string dummyHash;

    public PasswordService() => dummyHash = hasher.HashPassword(dummy, Guid.NewGuid().ToString());
    public string Hash(Usuario usuario, string password) => hasher.HashPassword(usuario, password);
    public bool Verificar(Usuario? usuario, string password)
    {
        var result = hasher.VerifyHashedPassword(usuario ?? dummy, usuario?.PasswordHash ?? dummyHash, password);
        if (usuario is null || result == PasswordVerificationResult.Failed) return false;
        if (result == PasswordVerificationResult.SuccessRehashNeeded) usuario.PasswordHash = Hash(usuario, password);
        return true;
    }
}

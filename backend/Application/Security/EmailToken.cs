using System.Security.Cryptography;
using System.Text;

namespace Miralist.Application.Security;

public static class EmailToken
{
    public static string Crear() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    public static bool EsValido(string? token) => token is { Length: 64 } && token.All(Uri.IsHexDigit);
    public static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token.ToUpperInvariant())));
}

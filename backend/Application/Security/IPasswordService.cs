using Miralist.Domain.Models;

namespace Miralist.Application.Security;

public interface IPasswordService
{
    string Hash(Usuario usuario, string password);
    bool Verificar(Usuario? usuario, string password);
}

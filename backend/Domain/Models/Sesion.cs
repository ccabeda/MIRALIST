namespace Miralist.Domain.Models;

public class Sesion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UsuarioId { get; set; }
    public DateTime ExpiraUtc { get; set; }
}

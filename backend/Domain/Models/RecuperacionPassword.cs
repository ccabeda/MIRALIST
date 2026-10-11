namespace Miralist.Domain.Models;

public class RecuperacionPassword
{
    public string TokenHash { get; set; } = "";
    public Guid UsuarioId { get; set; }
    public DateTime CreadoUtc { get; set; }
    public DateTime ExpiraUtc { get; set; }
}

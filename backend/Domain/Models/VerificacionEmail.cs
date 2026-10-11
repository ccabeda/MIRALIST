namespace Miralist.Domain.Models;

public class VerificacionEmail
{
    public string TokenHash { get; set; } = "";
    public Guid UsuarioId { get; set; }
    public string Email { get; set; } = "";
    public DateTime CreadoUtc { get; set; }
    public DateTime ExpiraUtc { get; set; }
}

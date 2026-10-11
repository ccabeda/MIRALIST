namespace Miralist.Domain.Models;

public class Usuario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Nombre { get; set; } = "";
    public string Email { get; set; } = "";
    public string EmailNormalizado { get; set; } = "";
    public bool EmailVerificado { get; set; }
    public string? EmailPendiente { get; set; }
    public string PasswordHash { get; set; } = "";
    public int IntentosFallidos { get; set; }
    public DateTime? BloqueadoHastaUtc { get; set; }
    public DateTime CreadoUtc { get; set; } = DateTime.UtcNow;
}

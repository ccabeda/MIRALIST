using System.ComponentModel.DataAnnotations;

namespace Miralist.Application.DTOs.Auth;

public class RegistroDto
{
    [Required, StringLength(40, MinimumLength = 1)]
    public string Nombre { get; set; } = "";
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; set; } = "";
    [Required, StringLength(128, MinimumLength = 12)]
    public string Password { get; set; } = "";
}

public class LoginDto
{
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; set; } = "";
    [Required, StringLength(128, MinimumLength = 1)]
    public string Password { get; set; } = "";
}

public record UsuarioDto(Guid Id, string Nombre, string Email, bool EmailVerificado = false,
    string? EmailPendiente = null, string? AvisoCorreo = null);
public record SesionDto(UsuarioDto Usuario, Guid SesionId, DateTime ExpiraUtc);

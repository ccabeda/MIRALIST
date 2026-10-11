using System.ComponentModel.DataAnnotations;

namespace Miralist.Application.DTOs.Auth;

public class EditarPerfilDto
{
    [Required, StringLength(40, MinimumLength = 1)]
    public string Nombre { get; set; } = "";
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; set; } = "";
    [Required, StringLength(128, MinimumLength = 1)]
    public string PasswordActual { get; set; } = "";
}

public class CambiarPasswordDto
{
    [Required, StringLength(128, MinimumLength = 1)]
    public string PasswordActual { get; set; } = "";
    [Required, StringLength(128, MinimumLength = 12)]
    public string PasswordNueva { get; set; } = "";
}

public class SolicitarRecuperacionDto
{
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; set; } = "";
}

public class RestablecerPasswordDto
{
    [Required, RegularExpression("^[A-Fa-f0-9]{64}$")]
    public string Token { get; set; } = "";
    [Required, StringLength(128, MinimumLength = 12)]
    public string PasswordNueva { get; set; } = "";
}

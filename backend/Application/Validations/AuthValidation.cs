using System.ComponentModel.DataAnnotations;
using Miralist.Application.Exceptions;

namespace Miralist.Application.Validations;

public static class AuthValidation
{
    public static void Validate(object request)
    {
        var errors = new List<ValidationResult>();
        if (!Validator.TryValidateObject(request, new ValidationContext(request), errors, true))
            throw new AuthException(400, "Revisá los datos. La contraseña de registro debe tener entre 12 y 128 caracteres.");
    }

    public static string NormalizarEmail(string email) => email.Trim().ToUpperInvariant();
}

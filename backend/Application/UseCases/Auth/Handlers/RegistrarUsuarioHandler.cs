using Miralist.Application.DTOs.Auth;
using Miralist.Application.Exceptions;
using Miralist.Application.IHandlers;
using Miralist.Application.IRepository;
using Miralist.Application.Security;
using Miralist.Application.UseCases.Auth.Commands;
using Miralist.Application.Validations;
using Miralist.Domain.Models;

namespace Miralist.Application.UseCases.Auth.Handlers;

public class RegistrarUsuarioHandler(IUsuarioRepository usuarios, IPasswordService passwords,
    CrearSesion sesiones, TimeProvider clock, VerificacionEmailHandler verificacion) : IRegistrarUsuarioHandler
{
    public async Task<SesionDto> Handle(RegistrarUsuarioCommand command, CancellationToken ct)
    {
        var datos = command.Datos;
        AuthValidation.Validate(datos);
        if (string.IsNullOrWhiteSpace(datos.Nombre)) throw new AuthException(400, "Ingresá tu nombre.");
        var email = AuthValidation.NormalizarEmail(datos.Email);
        if (await usuarios.PorEmail(email, ct) is not null)
            throw new AuthException(409, "No se pudo registrar esa dirección de correo.");
        var usuario = new Usuario
        {
            Nombre = datos.Nombre.Trim(), Email = datos.Email.Trim(), EmailNormalizado = email,
            CreadoUtc = clock.GetUtcNow().UtcDateTime
        };
        usuario.PasswordHash = passwords.Hash(usuario, datos.Password);
        await usuarios.Agregar(usuario, ct);
        var aviso = await verificacion.IntentarEnviar(usuario.Id, ct);
        var sesion = await sesiones.Para(usuario, ct);
        return sesion with { Usuario = sesion.Usuario with { AvisoCorreo = aviso } };
    }
}

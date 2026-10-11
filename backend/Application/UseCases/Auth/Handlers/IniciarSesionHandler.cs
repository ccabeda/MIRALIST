using Miralist.Application.DTOs.Auth;
using Miralist.Application.Exceptions;
using Miralist.Application.IHandlers;
using Miralist.Application.IRepository;
using Miralist.Application.Security;
using Miralist.Application.UseCases.Auth.Commands;
using Miralist.Application.Validations;

namespace Miralist.Application.UseCases.Auth.Handlers;

public class IniciarSesionHandler(IUsuarioRepository usuarios, IPasswordService passwords,
    CrearSesion sesiones, TimeProvider clock) : IIniciarSesionHandler
{
    public async Task<SesionDto> Handle(IniciarSesionCommand command, CancellationToken ct)
    {
        var datos = command.Datos;
        AuthValidation.Validate(datos);
        var usuario = await usuarios.PorEmail(AuthValidation.NormalizarEmail(datos.Email), ct);
        var ahora = clock.GetUtcNow().UtcDateTime;
        var valida = passwords.Verificar(usuario, datos.Password);
        if (usuario is null || usuario.BloqueadoHastaUtc > ahora || !valida)
        {
            if (usuario is not null && !(usuario.BloqueadoHastaUtc > ahora))
            {
                if (usuario.BloqueadoHastaUtc.HasValue) usuario.IntentosFallidos = 0;
                usuario.BloqueadoHastaUtc = null;
                usuario.IntentosFallidos++;
                if (usuario.IntentosFallidos >= 5) usuario.BloqueadoHastaUtc = ahora.AddMinutes(15);
                await usuarios.Guardar(ct);
            }
            throw new AuthException(401, "No se pudo iniciar sesión. Revisá tus datos o intentá más tarde.");
        }
        usuario.IntentosFallidos = 0;
        usuario.BloqueadoHastaUtc = null;
        await usuarios.Guardar(ct);
        return await sesiones.Para(usuario, ct);
    }
}

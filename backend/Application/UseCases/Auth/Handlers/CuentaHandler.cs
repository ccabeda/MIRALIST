using Miralist.Application.DTOs.Auth;
using Miralist.Application.Exceptions;
using Miralist.Application.IRepository;
using Miralist.Application.Security;
using Miralist.Application.Validations;
using Miralist.Domain.Models;

namespace Miralist.Application.UseCases.Auth.Handlers;

public class CuentaHandler(IUsuarioRepository usuarios, ICuentaRepository cuentas, IPasswordService passwords,
    TimeProvider clock, VerificacionEmailHandler verificacion)
{
    private async Task<Usuario> Verificar(Guid id, string password, CancellationToken ct)
    {
        var usuario = await usuarios.PorId(id, ct);
        if (!passwords.Verificar(usuario, password) || usuario is null || usuario.BloqueadoHastaUtc > clock.GetUtcNow().UtcDateTime)
            throw new AuthException(400, "No se pudo verificar la contraseña actual.");
        return usuario;
    }

    public async Task<UsuarioDto> Editar(Guid id, EditarPerfilDto datos, CancellationToken ct)
    {
        AuthValidation.Validate(datos);
        if (string.IsNullOrWhiteSpace(datos.Nombre)) throw new AuthException(400, "Ingresá tu nombre.");
        var usuario = await Verificar(id, datos.PasswordActual, ct);
        await cuentas.EditarPerfil(id, usuario.PasswordHash, datos.Nombre.Trim(), datos.Email.Trim(), ct);
        var aviso = await verificacion.IntentarEnviar(id, ct);
        var actual = (await usuarios.PorId(id, ct))!;
        return new UsuarioDto(id, actual.Nombre, actual.Email, actual.EmailVerificado, actual.EmailPendiente, aviso);
    }

    public async Task CambiarPassword(Guid id, CambiarPasswordDto datos, CancellationToken ct)
    {
        AuthValidation.Validate(datos);
        var usuario = await Verificar(id, datos.PasswordActual, ct);
        if (passwords.Verificar(usuario, datos.PasswordNueva)) throw new AuthException(400, "Elegí una contraseña diferente de la actual.");
        await cuentas.CambiarPassword(id, usuario.PasswordHash, passwords.Hash(usuario, datos.PasswordNueva), ct);
    }

    public Task CerrarSesiones(Guid id, CancellationToken ct) => cuentas.CerrarSesiones(id, ct);
}

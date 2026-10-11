using Miralist.Application.DTOs.Auth;
using Miralist.Application.Exceptions;
using Miralist.Application.IRepository;
using Miralist.Application.Security;
using Miralist.Application.Validations;
using Miralist.Domain.Models;

namespace Miralist.Application.UseCases.Auth.Handlers;

public class RecuperacionHandler(IUsuarioRepository usuarios, ICuentaRepository cuentas,
    IPasswordService passwords, IRecoveryEmailSender correo, TimeProvider clock)
{
    public async Task Solicitar(SolicitarRecuperacionDto datos, CancellationToken ct)
    {
        AuthValidation.Validate(datos);
        if (!correo.Disponible) throw new AuthException(503, "La recuperación por correo todavía no está configurada.");
        var usuario = await usuarios.PorEmail(AuthValidation.NormalizarEmail(datos.Email), ct);
        if (usuario is null) return;
        var ahora = clock.GetUtcNow().UtcDateTime;
        var token = EmailToken.Crear();
        var recuperacion = new RecuperacionPassword
        { TokenHash = EmailToken.Hash(token), UsuarioId = usuario.Id, CreadoUtc = ahora, ExpiraUtc = ahora.AddMinutes(30) };
        if (!await cuentas.CrearRecuperacion(usuario, recuperacion, ct)) return;
        try { await correo.Enviar(usuario.Email, token, ct); }
        catch (HttpRequestException) { await cuentas.EliminarRecuperacion(recuperacion.TokenHash, CancellationToken.None); }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        { await cuentas.EliminarRecuperacion(recuperacion.TokenHash, CancellationToken.None); }
        // The response is identical for unknown addresses and mail delivery failures.
    }

    public async Task Restablecer(RestablecerPasswordDto datos, CancellationToken ct)
    {
        AuthValidation.Validate(datos);
        var recuperacion = await cuentas.BuscarRecuperacion(EmailToken.Hash(datos.Token), ct);
        var ahora = clock.GetUtcNow().UtcDateTime;
        if (recuperacion is null || recuperacion.ExpiraUtc <= ahora)
            throw new AuthException(400, "El enlace es inválido o venció. Pedí uno nuevo.");
        var usuario = await usuarios.PorId(recuperacion.UsuarioId, ct)
            ?? throw new AuthException(400, "El enlace es inválido o venció. Pedí uno nuevo.");
        await cuentas.RestablecerPassword(recuperacion, ahora, passwords.Hash(usuario, datos.PasswordNueva), ct);
    }
}

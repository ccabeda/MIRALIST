using Miralist.Application.Exceptions;
using Miralist.Application.IRepository;
using Miralist.Application.Security;
using Miralist.Domain.Models;

namespace Miralist.Application.UseCases.Auth.Handlers;

public class VerificacionEmailHandler(IUsuarioRepository usuarios, IVerificacionEmailRepository tokens,
    IVerificationEmailSender correo, TimeProvider clock)
{
    public async Task Solicitar(Guid id, CancellationToken ct)
    {
        if (!correo.Disponible) throw new AuthException(503, "La verificación por correo todavía no está configurada.");
        var usuario = await usuarios.PorId(id, ct) ?? throw new AuthException(401, "Iniciá sesión nuevamente.");
        if (usuario.EmailVerificado && usuario.EmailPendiente is null) return;
        var token = EmailToken.Crear();
        var ahora = clock.GetUtcNow().UtcDateTime;
        var verificacion = new VerificacionEmail { UsuarioId = id, TokenHash = EmailToken.Hash(token),
            Email = usuario.EmailPendiente ?? usuario.Email, CreadoUtc = ahora, ExpiraUtc = ahora.AddHours(24) };
        if (!await tokens.Crear(usuario, verificacion, ct))
            throw new AuthException(429, "Esperá un minuto antes de pedir otro enlace o actualizá tu cuenta.");
        try { await correo.EnviarVerificacion(verificacion.Email, token, ct); }
        catch (Exception ex) when (ex is HttpRequestException || ex is OperationCanceledException && !ct.IsCancellationRequested)
        {
            await tokens.Eliminar(verificacion.TokenHash, CancellationToken.None);
            throw new AuthException(503, "No se pudo enviar la verificación. Podés reintentar desde tu perfil.");
        }
    }

    // Registration/profile changes remain saved if the mail provider is temporarily unavailable.
    public async Task<string?> IntentarEnviar(Guid id, CancellationToken ct)
    {
        try { await Solicitar(id, ct); return null; }
        catch (AuthException ex) when (ex.StatusCode is 429 or 503)
        { return "Tu cuenta se guardó, pero no se envió un nuevo enlace de verificación. " + ex.Message; }
    }

    public Task Confirmar(string token, CancellationToken ct)
    {
        if (!EmailToken.EsValido(token))
            throw new AuthException(400, "El enlace es inválido o venció. Pedí uno nuevo desde tu perfil.");
        return tokens.Confirmar(EmailToken.Hash(token), clock.GetUtcNow().UtcDateTime, ct);
    }
}

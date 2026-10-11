namespace Miralist.Application.Security;

public interface IVerificationEmailSender
{
    bool Disponible { get; }
    Task EnviarVerificacion(string destinatario, string token, CancellationToken ct);
}

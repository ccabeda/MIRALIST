namespace Miralist.Application.Security;

public interface IRecoveryEmailSender
{
    bool Disponible { get; }
    Task Enviar(string destinatario, string token, CancellationToken ct);
}

using System.Net.Http.Json;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Miralist.Application.Security;

namespace Miralist.Infrastructure.Security;

public class BrevoEmailSender(HttpClient http, IConfiguration configuration,
    ILogger<BrevoEmailSender> logger) : IRecoveryEmailSender, IVerificationEmailSender
{
    public bool Disponible => configuration.GetValue<bool>("Email:Enabled")
        && !string.IsNullOrWhiteSpace(configuration["Email:ApiKey"])
        && MailAddress.TryCreate(configuration["Email:SenderAddress"], out _)
        && Uri.TryCreate(configuration["Email:PublicAppUrl"], UriKind.Absolute, out var app)
        && (app.Scheme == "https" || (app.Scheme == "http" && app.IsLoopback))
        && string.IsNullOrEmpty(app.UserInfo) && string.IsNullOrEmpty(app.Fragment) && string.IsNullOrEmpty(app.Query);

    public Task Enviar(string destinatario, string token, CancellationToken ct) =>
        EnviarMensaje(destinatario, token, false, ct);

    public Task EnviarVerificacion(string destinatario, string token, CancellationToken ct) =>
        EnviarMensaje(destinatario, token, true, ct);

    private async Task EnviarMensaje(string destinatario, string token, bool verificar, CancellationToken ct)
    {
        if (!Disponible) throw new InvalidOperationException("El envío de correos no está configurado.");
        var link = configuration["Email:PublicAppUrl"]!.TrimEnd('/')
            + (verificar ? "/#verify-email=" : "/#reset-password=") + Uri.EscapeDataString(token);
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
        request.Headers.Add("api-key", configuration["Email:ApiKey"]);
        request.Content = JsonContent.Create(new
        {
            sender = new { email = configuration["Email:SenderAddress"], name = "MiráList" },
            to = new[] { new { email = destinatario } },
            subject = verificar ? "Verificá tu correo de MiráList" : "Restablecer tu contraseña de MiráList",
            textContent = verificar
                ? $"Confirmá esta dirección de correo para tu cuenta de MiráList. El enlace vale por 24 horas y se puede usar una sola vez:\n\n{link}\n\nSi no hiciste este pedido, ignorá este mensaje."
                : $"Recibimos un pedido para cambiar tu contraseña. Abrí este enlace, válido durante 30 minutos y para un solo uso:\n\n{link}\n\nSi no hiciste este pedido, podés ignorar este correo. Tu contraseña no se modificó."
        });
        try
        {
            using var response = await http.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();
        }
        catch (HttpRequestException)
        {
            logger.LogWarning("No se pudo enviar un correo de cuenta. Revisá la configuración de Brevo.");
            throw;
        }
    }
}

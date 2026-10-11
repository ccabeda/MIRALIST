using System.Collections.Concurrent;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Miralist.Application.Security;

namespace Miralist.API.Tests;

public class TestClock : TimeProvider
{
    public DateTimeOffset Now { get; set; } = DateTimeOffset.UtcNow;
    public override DateTimeOffset GetUtcNow() => Now;
}

public class TestRecoveryMail : IRecoveryEmailSender
{
    public bool Disponible { get; set; } = true;
    public bool Fail { get; set; }
    public ConcurrentQueue<(string Email, string Token)> Sent { get; } = new();
    public Task Enviar(string destinatario, string token, CancellationToken ct)
    {
        if (Fail) throw new HttpRequestException("Simulated mail outage");
        Sent.Enqueue((destinatario, token));
        return Task.CompletedTask;
    }
}

public class RecoveryFactory : AuthFactory
{
    public TestRecoveryMail Mail { get; } = new();
    public TestVerificationMail Verification { get; } = new();
    public TestClock Clock { get; } = new();
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IRecoveryEmailSender>(); services.AddSingleton<IRecoveryEmailSender>(Mail);
            services.RemoveAll<IVerificationEmailSender>(); services.AddSingleton<IVerificationEmailSender>(Verification);
            services.RemoveAll<TimeProvider>(); services.AddSingleton<TimeProvider>(Clock);
        });
    }
}

public class TestVerificationMail : IVerificationEmailSender
{
    public bool Disponible { get; set; } = true;
    public bool Fail { get; set; }
    public ConcurrentQueue<(string Email, string Token)> Sent { get; } = new();
    public Task EnviarVerificacion(string destinatario, string token, CancellationToken ct)
    {
        if (Fail) throw new HttpRequestException("Simulated mail outage");
        Sent.Enqueue((destinatario, token));
        return Task.CompletedTask;
    }
}

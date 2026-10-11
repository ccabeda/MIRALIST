using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Miralist.Application.IRepository;
using Miralist.Application.Security;
using Miralist.Infrastructure.Persistence;
using Miralist.Infrastructure.Repository;
using Miralist.Infrastructure.Security;

namespace Miralist.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddDbContext<MiralistDbContext>((provider, options) => options.UseSqlServer(
            provider.GetRequiredService<IConfiguration>().GetConnectionString("Miralist")
            ?? throw new InvalidOperationException("Configurá ConnectionStrings:Miralist para SQL Server.")));
        services.AddScoped<IUsuarioRepository, UsuarioRepository>();
        services.AddScoped<ISesionRepository, SesionRepository>();
        services.AddScoped<ICuentaRepository, CuentaRepository>();
        services.AddScoped<IVerificacionEmailRepository, VerificacionEmailRepository>();
        services.AddHttpClient<IVerificationEmailSender, BrevoEmailSender>(client => client.Timeout = TimeSpan.FromSeconds(15));
        services.AddHttpClient<IRecoveryEmailSender, BrevoEmailSender>(client => client.Timeout = TimeSpan.FromSeconds(15));
        services.AddScoped<IBibliotecaRepository, BibliotecaRepository>();
        services.AddSingleton<IPasswordService, PasswordService>();
        return services;
    }
}

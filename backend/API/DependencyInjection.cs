using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.RateLimiting;
using Miralist.API.Security;
using Miralist.Application.IHandlers;
using Miralist.Application.UseCases.Auth.Handlers;

namespace Miralist.API;

public static class DependencyInjection
{
    public static void AddApi(this IServiceCollection services, bool development)
    {
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<IRegistrarUsuarioHandler, RegistrarUsuarioHandler>();
        services.AddScoped<IIniciarSesionHandler, IniciarSesionHandler>();
        services.AddScoped<IUsuarioActualHandler, UsuarioActualHandler>();
        services.AddScoped<ICerrarSesionHandler, CerrarSesionHandler>();
        services.AddScoped<CrearSesion>();
        services.AddScoped<CuentaHandler>();
        services.AddScoped<RecuperacionHandler>();
        services.AddScoped<VerificacionEmailHandler>();
        services.AddScoped<Miralist.Application.UseCases.Biblioteca.ObtenerBibliotecaHandler>();
        services.AddScoped<Miralist.Application.UseCases.Biblioteca.GuardarBibliotecaHandler>();
        services.AddScoped<SessionCookieEvents>();
        services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options =>
        {
            options.Cookie.Name = "miralist.session";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = development ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.SlidingExpiration = false;
            options.EventsType = typeof(SessionCookieEvents);
        });
        services.AddAuthorization();
        services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-CSRF-TOKEN";
            options.Cookie.Name = "miralist.csrf";
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = development ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        });
        services.AddControllers(options => options.Filters.Add<CsrfFilter>());
        services.AddProblemDetails();
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = 429;
            options.AddPolicy("account", context => RateLimitPartition.GetFixedWindowLimiter(
                context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
            options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
        });
    }
}

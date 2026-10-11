using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Miralist.API;
using Miralist.Application.Exceptions;
using Miralist.Infrastructure;
using Miralist.Infrastructure.Persistence;

var initialize = args.Contains("--init-db");
var builder = WebApplication.CreateBuilder(args.Where(arg => arg != "--init-db").ToArray());
if (builder.Environment.IsDevelopment())
    builder.Configuration.AddJsonFile("App_Data/email.json", optional: true, reloadOnChange: true)
        .AddEnvironmentVariables();
builder.Services.AddInfrastructure();
builder.Services.AddApi(builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing"));
builder.Services.AddDataProtection().SetApplicationName("Miralist");
builder.Services.AddOptions<Microsoft.AspNetCore.DataProtection.KeyManagement.KeyManagementOptions>()
    .Configure<IConfiguration, IHostEnvironment>((options, configuration, environment) =>
    {
        var directory = configuration["DataProtection:Directory"]
            ?? Path.Combine(environment.ContentRootPath, "App_Data", "keys");
        options.XmlRepository = new Microsoft.AspNetCore.DataProtection.Repositories.FileSystemXmlRepository(
            new DirectoryInfo(directory), Microsoft.Extensions.Logging.Abstractions.NullLoggerFactory.Instance);
    });

var app = builder.Build();
if (initialize)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<MiralistDbContext>();
    Console.WriteLine($"Inicializando exclusivamente: {db.Database.GetDbConnection().DataSource} / {db.Database.GetDbConnection().Database}");
    await db.Database.MigrateAsync();
    return;
}

app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    var status = exception is AuthException auth ? auth.StatusCode : 500;
    await Results.Problem(statusCode: status, title: exception is AuthException ? exception.Message : "No se pudo completar la operación.")
        .ExecuteAsync(context);
}));
app.Use(async (context, next) =>
{
    context.Response.Headers.CacheControl = "no-store";
    context.Response.Headers.XContentTypeOptions = "nosniff";
    await next();
});
app.UseRouting();
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.Run();

public partial class Program;

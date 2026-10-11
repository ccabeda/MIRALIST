using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Miralist.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;

namespace Miralist.API.Tests;

public class AuthFactory : WebApplicationFactory<Program>
{
    private readonly string directory = Path.Combine(Path.GetTempPath(), "miralist-auth-tests", Guid.NewGuid().ToString());
    private readonly string databaseName = "MiralistAuthTests_" + Guid.NewGuid().ToString("N");
    private bool databaseCreated;
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        Directory.CreateDirectory(directory);
        builder.UseEnvironment("Testing");
        var connection = new SqlConnectionStringBuilder(Environment.GetEnvironmentVariable("MIRALIST_TEST_SQLSERVER")
            ?? @"Server=.\SQLEXPRESS;Integrated Security=True;Encrypt=True;TrustServerCertificate=True") { InitialCatalog = databaseName };
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(
            new Dictionary<string, string?> { ["ConnectionStrings:Miralist"] = connection.ToString(), ["DataProtection:Directory"] = directory }));
    }
    public async Task<HttpClient> Client()
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MiralistDbContext>();
        if (db.Database.GetDbConnection().Database != databaseName) throw new InvalidOperationException("La prueba exige su base temporal.");
        await db.Database.MigrateAsync();
        databaseCreated = true;
        return client;
    }
    protected override void Dispose(bool disposing)
    {
        if (disposing && databaseCreated)
        {
            databaseCreated = false;
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MiralistDbContext>();
            if (db.Database.GetDbConnection().Database != databaseName) throw new InvalidOperationException("Base de prueba inesperada.");
            db.Database.EnsureDeleted();
        }
        base.Dispose(disposing);
        if (Directory.Exists(directory)) Directory.Delete(directory, true);
    }
}

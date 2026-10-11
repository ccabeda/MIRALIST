using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Miralist.Infrastructure.Persistence;
using Xunit;

namespace Miralist.API.Tests;

public class AuthTests
{
    private static object Account(string email = "test@example.test", string password = "Prueba-segura-123!") =>
        new { nombre = "Prueba", email, password };

    private static async Task<HttpResponseMessage> Post(HttpClient client, string path, object body)
    {
        var csrf = await client.GetFromJsonAsync<JsonElement>("/api/auth/csrf");
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/" + path)
        { Content = JsonContent.Create(body) };
        request.Headers.Add("X-CSRF-TOKEN", csrf.GetProperty("token").GetString());
        return await client.SendAsync(request);
    }

    [Fact]
    public async Task RegisterStoresHashAndCookieLogoutRevokesSession()
    {
        using var factory = new AuthFactory();
        using var client = await factory.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        var response = await Post(client, "register", Account());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("password", body, StringComparison.OrdinalIgnoreCase);
        var cookie = response.Headers.GetValues("Set-Cookie").Single(x => x.StartsWith("miralist.session="));
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<MiralistDbContext>();
            Assert.NotEqual("Prueba-segura-123!", (await db.Usuarios.SingleAsync()).PasswordHash);
            Assert.Equal(1, await db.Sesiones.CountAsync());
        }
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, "logout", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        using var stolen = factory.CreateClient(new() { HandleCookies = false });
        stolen.DefaultRequestHeaders.Add("Cookie", cookie.Split(';')[0]);
        Assert.Equal(HttpStatusCode.Unauthorized, (await stolen.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "login", Account())).StatusCode);
    }

    [Fact]
    public async Task RejectsCsrfWeakPasswordAndCaseInsensitiveDuplicateEmail()
    {
        using var factory = new AuthFactory();
        using var client = await factory.Client();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/register", Account())).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "register", Account(password: "short"))).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await Post(client, "register", Account())).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Post(client, "register", Account("TEST@example.test"))).StatusCode);
    }

    [Fact]
    public async Task WrongPasswordsLockAccountAndNeverCreateSession()
    {
        using var factory = new AuthFactory();
        using var client = await factory.Client();
        await Post(client, "register", Account());
        await Post(client, "logout", new { });
        for (var attempt = 0; attempt < 5; attempt++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await Post(client, "login", Account(password: "incorrecta"))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Post(client, "login", Account())).StatusCode);
        using var scope = factory.Services.CreateScope();
        Assert.Equal(0, await scope.ServiceProvider.GetRequiredService<MiralistDbContext>().Sesiones.CountAsync());
    }

    [Fact]
    public async Task DifferentAccountsHaveDifferentIdentities()
    {
        using var factory = new AuthFactory();
        using var first = await factory.Client();
        using var second = factory.CreateClient();
        await Post(first, "register", Account("one@example.test"));
        await Post(second, "register", Account("two@example.test"));
        var one = await first.GetFromJsonAsync<JsonElement>("/api/auth/me");
        var two = await second.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.NotEqual(one.GetProperty("id").GetString(), two.GetProperty("id").GetString());
        Assert.Equal("one@example.test", one.GetProperty("email").GetString());
        Assert.Equal("two@example.test", two.GetProperty("email").GetString());
    }
}

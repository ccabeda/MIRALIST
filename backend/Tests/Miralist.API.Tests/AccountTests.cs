using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;
using static Miralist.API.Tests.AccountClient;

namespace Miralist.API.Tests;

public class AccountTests
{
    [Fact]
    public async Task ProfileRequiresPasswordKeepsIdentityAndRejectsDuplicateEmail()
    {
        using var factory = new RecoveryFactory();
        using var client = await factory.Client();
        using var second = factory.CreateClient();
        using var occupied = factory.CreateClient();
        var id = await Register(client);
        await Login(second);
        await Register(occupied, "occupied@example.test");
        await Post(client, "forgot-password", new { email = "one@example.test" });
        var token = factory.Mail.Sent.Single().Token;
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "profile", new { nombre = "Nuevo", email = "new@example.test", passwordActual = "wrong" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await Post(client, "profile", new { nombre = "Nuevo", email = "OCCUPIED@example.test", passwordActual = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "profile", new { nombre = "Nuevo", email = "new@example.test", passwordActual = Password })).StatusCode);
        var updated = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Equal(id, updated.GetProperty("id").GetGuid());
        Assert.Equal("Nuevo", updated.GetProperty("nombre").GetString());
        Assert.Equal("one@example.test", updated.GetProperty("email").GetString());
        Assert.Equal("new@example.test", updated.GetProperty("emailPendiente").GetString());
        Assert.Equal(HttpStatusCode.OK, (await second.GetAsync("/api/auth/me")).StatusCode);
        var verification = factory.Verification.Sent.Last();
        Assert.Equal("new@example.test", verification.Email);
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "verify-email", new { token = verification.Token })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await second.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "reset-password", new { token, passwordNueva = NewPassword })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Login(second)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Login(second, "new@example.test")).StatusCode);
    }

    [Fact]
    public async Task PasswordChangeRevokesEverySessionAndOldRecoveryTokens()
    {
        using var factory = new RecoveryFactory();
        using var client = await factory.Client();
        using var second = factory.CreateClient();
        await Register(client); await Login(second);
        await Post(client, "forgot-password", new { email = "one@example.test" });
        var token = factory.Mail.Sent.Single().Token;
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "change-password", new { passwordActual = "wrong", passwordNueva = NewPassword })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "change-password", new { passwordActual = Password, passwordNueva = "short" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "change-password", new { passwordActual = Password, passwordNueva = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, "change-password", new { passwordActual = Password, passwordNueva = NewPassword })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await second.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "reset-password", new { token, passwordNueva = Password })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Login(client)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Login(client, password: NewPassword)).StatusCode);
    }

    [Fact]
    public async Task LogoutAllIsScopedToOneUserAndProtectedByCsrfAndIdentity()
    {
        using var factory = new AuthFactory();
        using var client = await factory.Client();
        using var second = factory.CreateClient();
        using var other = factory.CreateClient();
        var id = await Register(client); await Login(second); await Register(other, "other@example.test");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/auth/logout-all", new { })).StatusCode);
        client.DefaultRequestHeaders.Remove("X-Miralist-User");
        Assert.Equal(HttpStatusCode.Conflict, (await Post(client, "logout-all", new { })).StatusCode);
        client.DefaultRequestHeaders.Add("X-Miralist-User", id.ToString());
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, "logout-all", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await second.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await other.GetAsync("/api/auth/me")).StatusCode);
    }
}

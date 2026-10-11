using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Miralist.Domain.Models;
using Miralist.Infrastructure.Persistence;
using Xunit;
using static Miralist.API.Tests.AccountClient;

namespace Miralist.API.Tests;

public class EmailVerificationTests
{
    [Fact]
    public async Task MailFailureIsVisibleAfterRegistrationAndProfileChange()
    {
        using var factory = new RecoveryFactory();
        factory.Verification.Fail = true;
        using var client = await factory.Client();
        var response = await Post(client, "register", new { nombre = "Prueba", email = "one@example.test", password = Password });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrWhiteSpace(user.GetProperty("avisoCorreo").GetString()));
        client.DefaultRequestHeaders.Add("X-Miralist-User", user.GetProperty("id").GetString());
        response = await Post(client, "profile", new { nombre = "Prueba", email = "new@example.test", passwordActual = Password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        user = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("one@example.test", user.GetProperty("email").GetString());
        Assert.Equal("new@example.test", user.GetProperty("emailPendiente").GetString());
        Assert.False(string.IsNullOrWhiteSpace(user.GetProperty("avisoCorreo").GetString()));
    }

    [Fact]
    public async Task RegistrationSendsHashedExpiringSingleUseTokenAndResendReplacesIt()
    {
        using var factory = new RecoveryFactory();
        using var client = await factory.Client();
        await Register(client);
        var first = Assert.Single(factory.Verification.Sent);
        var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.False(me.GetProperty("emailVerificado").GetBoolean());
        using (var scope = factory.Services.CreateScope())
        {
            var stored = await scope.ServiceProvider.GetRequiredService<MiralistDbContext>().Set<VerificacionEmail>().SingleAsync();
            Assert.NotEqual(first.Token, stored.TokenHash);
            Assert.Equal(TimeSpan.FromHours(24), stored.ExpiraUtc - stored.CreadoUtc);
        }
        Assert.Equal(HttpStatusCode.TooManyRequests, (await Post(client, "resend-verification", new { })).StatusCode);
        factory.Clock.Now = factory.Clock.Now.AddMinutes(2);
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "resend-verification", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "verify-email", new { token = first.Token })).StatusCode);
        var token = factory.Verification.Sent.Last().Token;
        using var other = factory.CreateClient();
        var results = await Task.WhenAll(Post(client, "verify-email", new { token }), Post(other, "verify-email", new { token }));
        Assert.Single(results, x => x.StatusCode == HttpStatusCode.OK);
        Assert.Single(results, x => x.StatusCode == HttpStatusCode.BadRequest);
        me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.True(me.GetProperty("emailVerificado").GetBoolean());
    }

    [Fact]
    public async Task ChangedPendingEmailInvalidatesOldLinkAndPasswordResetCancelsPendingChange()
    {
        using var factory = new RecoveryFactory();
        using var client = await factory.Client();
        await Register(client);
        var original = factory.Verification.Sent.Last().Token;
        await Post(client, "profile", new { nombre = "Uno", email = "new@example.test", passwordActual = Password });
        var changed = factory.Verification.Sent.Last().Token;
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "verify-email", new { token = original })).StatusCode);
        await Post(client, "forgot-password", new { email = "one@example.test" });
        Assert.Equal(HttpStatusCode.NoContent, (await Post(client, "reset-password", new { token = factory.Mail.Sent.Single().Token, passwordNueva = NewPassword })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "verify-email", new { token = changed })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Login(client, password: NewPassword)).StatusCode);
        var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Equal(JsonValueKind.Null, me.GetProperty("emailPendiente").ValueKind);
    }

    [Fact]
    public async Task ExpiredTokensFailAndMailFailureAllowsRetryWithoutLosingAccount()
    {
        using var factory = new RecoveryFactory();
        factory.Verification.Fail = true;
        using var client = await factory.Client();
        await Register(client);
        Assert.Empty(factory.Verification.Sent);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await Post(client, "resend-verification", new { })).StatusCode);
        factory.Verification.Fail = false;
        Assert.Equal(HttpStatusCode.OK, (await Post(client, "resend-verification", new { })).StatusCode);
        factory.Clock.Now = factory.Clock.Now.AddHours(25);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "verify-email", new { token = factory.Verification.Sent.Single().Token })).StatusCode);
    }
}

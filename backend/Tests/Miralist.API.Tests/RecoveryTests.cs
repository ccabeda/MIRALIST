using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Miralist.Domain.Models;
using Miralist.Infrastructure.Persistence;
using Xunit;
using static Miralist.API.Tests.AccountClient;

namespace Miralist.API.Tests;

public class RecoveryTests
{
    [Fact]
    public async Task UnconfiguredEmailNeverPretendsToSend()
    {
        using var factory = new AuthFactory();
        using var client = await factory.Client();
        await Register(client);
        var exists = await Post(client, "forgot-password", new { email = "one@example.test" });
        var unknown = await Post(client, "forgot-password", new { email = "missing@example.test" });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, exists.StatusCode);
        Assert.Equal(exists.StatusCode, unknown.StatusCode);
    }

    [Fact]
    public async Task RecoveryUsesHashedExpiringSingleUseTokenAndRevokesSessions()
    {
        using var factory = new RecoveryFactory();
        using var client = await factory.Client();
        using var second = factory.CreateClient();
        await Register(client); await Login(second);
        var exists = await Post(client, "forgot-password", new { email = "one@example.test" });
        var unknown = await Post(client, "forgot-password", new { email = "missing@example.test" });
        Assert.Equal(await exists.Content.ReadAsStringAsync(), await unknown.Content.ReadAsStringAsync());
        await Post(client, "forgot-password", new { email = "one@example.test" });
        var sent = Assert.Single(factory.Mail.Sent);
        using (var scope = factory.Services.CreateScope())
        {
            var saved = await scope.ServiceProvider.GetRequiredService<MiralistDbContext>().Set<RecuperacionPassword>().SingleAsync();
            Assert.NotEqual(sent.Token, saved.TokenHash);
            Assert.Equal(TimeSpan.FromMinutes(30), saved.ExpiraUtc - saved.CreadoUtc);
        }
        Assert.DoesNotContain(sent.Token, await exists.Content.ReadAsStringAsync());
        var results = await Task.WhenAll(
            Post(client, "reset-password", new { token = sent.Token, passwordNueva = NewPassword }),
            Post(second, "reset-password", new { token = sent.Token, passwordNueva = NewPassword }));
        Assert.Single(results, x => x.StatusCode == HttpStatusCode.NoContent);
        Assert.Single(results, x => x.StatusCode == HttpStatusCode.BadRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await second.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Login(client)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Login(client, password: NewPassword)).StatusCode);
    }

    [Fact]
    public async Task NewRequestInvalidatesPreviousLinkAndExpiredLinksFail()
    {
        using var factory = new RecoveryFactory();
        using var client = await factory.Client();
        await Register(client);
        await Post(client, "forgot-password", new { email = "one@example.test" });
        var first = factory.Mail.Sent.Single().Token;
        factory.Clock.Now = factory.Clock.Now.AddMinutes(2);
        await Post(client, "forgot-password", new { email = "one@example.test" });
        var second = factory.Mail.Sent.Last().Token;
        Assert.NotEqual(first, second);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "reset-password", new { token = first, passwordNueva = NewPassword })).StatusCode);
        factory.Clock.Now = factory.Clock.Now.AddMinutes(31);
        Assert.Equal(HttpStatusCode.BadRequest, (await Post(client, "reset-password", new { token = second, passwordNueva = NewPassword })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Login(client)).StatusCode);
    }

    [Fact]
    public async Task ProviderFailureDoesNotLeakAccountOrKeepUndeliveredToken()
    {
        using var factory = new RecoveryFactory();
        factory.Mail.Fail = true;
        using var client = await factory.Client();
        await Register(client);
        var known = await Post(client, "forgot-password", new { email = "one@example.test" });
        var unknown = await Post(client, "forgot-password", new { email = "missing@example.test" });
        Assert.Equal(HttpStatusCode.OK, known.StatusCode);
        Assert.Equal(await known.Content.ReadAsStringAsync(), await unknown.Content.ReadAsStringAsync());
        using var scope = factory.Services.CreateScope();
        Assert.Empty(await scope.ServiceProvider.GetRequiredService<MiralistDbContext>().Set<RecuperacionPassword>().ToListAsync());
    }
}

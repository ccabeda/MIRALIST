using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Miralist.Application.DTOs.Biblioteca;
using Xunit;

namespace Miralist.API.Tests;

public class BibliotecaTests
{
    private static async Task<Guid> Register(HttpClient client, string email)
    {
        var csrf = await client.GetFromJsonAsync<JsonElement>("/api/auth/csrf");
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/register")
        { Content = JsonContent.Create(new { nombre = "Prueba", email, password = "Prueba-segura-123!" }) };
        request.Headers.Add("X-CSRF-TOKEN", csrf.GetProperty("token").GetString());
        var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = user.GetProperty("id").GetGuid();
        client.DefaultRequestHeaders.Add("X-Miralist-User", id.ToString());
        return id;
    }

    private static async Task<HttpResponseMessage> Save(HttpClient client, ColeccionDto data)
    {
        var csrf = await client.GetFromJsonAsync<JsonElement>("/api/auth/csrf");
        using var request = new HttpRequestMessage(HttpMethod.Put, "/api/library") { Content = JsonContent.Create(data) };
        request.Headers.Add("X-CSRF-TOKEN", csrf.GetProperty("token").GetString());
        return await client.SendAsync(request);
    }
    private static Task<ColeccionDto?> Load(HttpClient client) => client.GetFromJsonAsync<ColeccionDto>("/api/library");
    private static ColeccionDto Collection() => new()
    {
        Library = new()
        {
            ["mal-1"] = new EntradaDto
            {
                Status = "Viendo", Progress = 3, Score = 7, Favorite = true, Notes = "Seguir después",
                StartDate = "2026-10-01", AddedAt = "2026-10-01T12:00:00Z", SeasonProgress = new() { ["1"] = 3 },
                Catalog = JsonSerializer.SerializeToElement(new { id = "mal-1", title = "Anime", category = "Anime", format = "TV", total = 12, providerIds = new { mal = 1 } })
            },
            ["tmdb-2"] = new EntradaDto
            {
                Status = "Completado", Progress = 1, Score = 9, WatchedDate = "2026-10-02",
                Catalog = JsonSerializer.SerializeToElement(new { id = "tmdb-2", title = "Película", category = "Películas", format = "Película", total = 1, providerIds = new { tmdb = 2 } })
            }
        },
        Folders = [new() { Id = "saga", Name = "Mi saga", TitleIds = ["tmdb-2", "mal-1"] }]
    };

    [Fact]
    public async Task RoundTripKeepsTrackingFolderOrderAndIsolatesAccounts()
    {
        using var factory = new AuthFactory();
        using var first = await factory.Client();
        using var second = factory.CreateClient();
        await Register(first, "one@example.test");
        await Register(second, "two@example.test");
        var input = Collection();
        Assert.Equal(HttpStatusCode.OK, (await Save(first, input)).StatusCode);
        var saved = (await Load(first))!;
        Assert.NotEqual(Guid.Empty, saved.Version);
        Assert.Equal(3, saved.Library["mal-1"].Progress);
        Assert.Equal(7, saved.Library["mal-1"].Score);
        Assert.True(saved.Library["mal-1"].Favorite);
        Assert.Equal("Seguir después", saved.Library["mal-1"].Notes);
        Assert.Equal("2026-10-01", saved.Library["mal-1"].StartDate);
        Assert.Equal(3, saved.Library["mal-1"].SeasonProgress!["1"]);
        Assert.Equal("2026-10-02", saved.Library["tmdb-2"].WatchedDate);
        Assert.Equal(input.Folders[0].TitleIds, saved.Folders[0].TitleIds);
        Assert.Empty((await Load(second))!.Library);
        saved.Folders[0].TitleIds.Reverse();
        Assert.Equal(HttpStatusCode.OK, (await Save(first, saved)).StatusCode);
        Assert.Equal("mal-1", (await Load(first))!.Folders[0].TitleIds[0]);
        var next = (await Load(first))!;
        next.Library.Remove("tmdb-2");
        next.Folders[0].TitleIds.Remove("tmdb-2");
        Assert.Equal(HttpStatusCode.OK, (await Save(first, next)).StatusCode);
        Assert.Single((await Load(first))!.Library);
        input.Version = (await Load(first))!.Version;
        Assert.Equal(HttpStatusCode.OK, (await Save(first, input)).StatusCode);
        Assert.Equal(2, (await Load(first))!.Library.Count);
    }

    [Fact]
    public async Task StaleAndConcurrentSavesCannotOverwriteNewerVersion()
    {
        using var factory = new AuthFactory();
        using var client = await factory.Client();
        await Register(client, "one@example.test");
        var data = Collection();
        var results = await Task.WhenAll(Save(client, data), Save(client, data));
        Assert.Single(results, x => x.StatusCode == HttpStatusCode.OK);
        Assert.Single(results, x => x.StatusCode == HttpStatusCode.Conflict);
        data.Library.Clear(); data.Folders.Clear();
        Assert.Equal(HttpStatusCode.Conflict, (await Save(client, data)).StatusCode);
        Assert.Equal(2, (await Load(client))!.Library.Count);
    }

    [Fact]
    public async Task InvalidPayloadIsRejectedWithoutChangingSavedCollection()
    {
        using var factory = new AuthFactory();
        using var client = await factory.Client();
        await Register(client, "one@example.test");
        Assert.Equal(HttpStatusCode.OK, (await Save(client, Collection())).StatusCode);
        var data = (await Load(client))!;
        var version = data.Version;
        data.Folders[0].TitleIds.Add("missing");
        Assert.Equal(HttpStatusCode.BadRequest, (await Save(client, data)).StatusCode);
        data = (await Load(client))!;
        data.Library["mal-1"].Progress = 100;
        Assert.Equal(HttpStatusCode.BadRequest, (await Save(client, data)).StatusCode);
        data = (await Load(client))!;
        data.Library["mal-duplicate"] = new EntradaDto { Catalog = JsonSerializer.SerializeToElement(new { id = "mal-duplicate", title = "Anime japonés", category = "Anime", providerIds = new { mal = "1" } }) };
        Assert.Equal(HttpStatusCode.BadRequest, (await Save(client, data)).StatusCode);
        Assert.Equal(version, (await Load(client))!.Version);
    }

    [Fact]
    public async Task RequiresSessionCsrfAndMatchingAccountHeader()
    {
        using var factory = new AuthFactory();
        using var client = await factory.Client();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/library")).StatusCode);
        await Register(client, "one@example.test");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync("/api/library", Collection())).StatusCode);
        client.DefaultRequestHeaders.Remove("X-Miralist-User");
        client.DefaultRequestHeaders.Add("X-Miralist-User", Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.Conflict, (await Save(client, Collection())).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.GetAsync("/api/library")).StatusCode);
    }
}

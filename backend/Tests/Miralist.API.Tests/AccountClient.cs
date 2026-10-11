using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace Miralist.API.Tests;

public static class AccountClient
{
    public const string Password = "Prueba-segura-123!";
    public const string NewPassword = "Otra-clave-segura-456!";
    public static async Task<HttpResponseMessage> Post(HttpClient client, string action, object body)
    {
        var csrf = await client.GetFromJsonAsync<JsonElement>("/api/auth/csrf");
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/" + action) { Content = JsonContent.Create(body) };
        request.Headers.Add("X-CSRF-TOKEN", csrf.GetProperty("token").GetString());
        return await client.SendAsync(request);
    }
    public static async Task<Guid> Register(HttpClient client, string email = "one@example.test")
    {
        var response = await Post(client, "register", new { nombre = "Prueba", email, password = Password });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = user.GetProperty("id").GetGuid();
        client.DefaultRequestHeaders.Add("X-Miralist-User", id.ToString());
        return id;
    }
    public static Task<HttpResponseMessage> Login(HttpClient client, string email = "one@example.test", string password = Password) =>
        Post(client, "login", new { email, password });
}

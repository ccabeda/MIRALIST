using System.Globalization;
using System.Text.Json;
using Miralist.Application.DTOs.Biblioteca;
using Miralist.Application.Exceptions;

namespace Miralist.Application.Validations;

public static class BibliotecaValidation
{
    private static readonly string[] Estados = ["Pendiente", "Viendo", "Completado", "Pausado", "Abandonado"];
    private static bool IdValido(string? id) => !string.IsNullOrWhiteSpace(id) && id.Length <= 150
        && id is not ("__proto__" or "constructor" or "prototype");
    private static bool FechaValida(string? value) => value == "" || (value is not null &&
        DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _));
    private static void Require(bool condition, string message)
    {
        if (!condition) throw new AuthException(400, message);
    }
    private static string Texto(JsonElement item, string key) => item.TryGetProperty(key, out var value)
        && value.ValueKind == JsonValueKind.String ? value.GetString()! : "";

    public static void Validate(ColeccionDto data)
    {
        Require(data.Library is not null && data.Folders is not null, "Colección inválida.");
        Require(data.Library!.Count <= 10000 && data.Folders!.Count <= 500, "La colección supera el límite permitido.");
        var providerKeys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var (id, entry) in data.Library)
        {
            Require(IdValido(id) && entry is not null, "Obra inválida.");
            Require(Estados.Contains(entry!.Status) && entry.Progress >= 0 && entry.Progress <= 1000000
                && entry.Score is >= 0 and <= 10 && entry.Notes is not null && entry.Notes.Length <= 2000,
                "Datos de seguimiento inválidos.");
            Require(FechaValida(entry.StartDate) && FechaValida(entry.FinishDate)
                && (entry.WatchedDate is null || FechaValida(entry.WatchedDate)), "Fechas inválidas.");
            Require(entry.StartDate == "" || entry.FinishDate == "" || string.CompareOrdinal(entry.StartDate, entry.FinishDate) <= 0,
                "La finalización no puede ser anterior al inicio.");
            Require(entry.AddedAt is null || (entry.AddedAt.Length <= 50 && DateTimeOffset.TryParse(entry.AddedAt, CultureInfo.InvariantCulture, DateTimeStyles.None, out _)), "Fecha de alta inválida.");
            var catalog = entry.Catalog;
            Require(catalog.ValueKind == JsonValueKind.Object, "Falta la ficha de la obra.");
            Require(Texto(catalog, "id") == id && !string.IsNullOrWhiteSpace(Texto(catalog, "title"))
                && catalog.GetRawText().Length <= 100000, "Ficha de obra inválida.");
            var movie = Texto(catalog, "format") == "Película" || Texto(catalog, "category") == "Películas";
            var total = movie ? 1 : catalog.TryGetProperty("total", out var amount) && amount.TryGetInt32Safe(out var number) ? number : 0;
            Require(total <= 0 || entry.Progress <= total, "El progreso supera el total de capítulos.");
            if (entry.SeasonProgress is not null)
            {
                Require(entry.SeasonProgress.All(x => int.TryParse(x.Key, out var season) && season >= 0 && x.Value >= 0)
                    && entry.SeasonProgress.Values.Sum(x => (long)x) == entry.Progress, "Progreso de temporadas inválido.");
            }
            if (catalog.TryGetProperty("providerIds", out var providers) && providers.ValueKind == JsonValueKind.Object)
                foreach (var provider in providers.EnumerateObject())
                {
                    Require(provider.Value.ValueKind is JsonValueKind.String or JsonValueKind.Number, "Identificador de catálogo inválido.");
                    var key = $"{Texto(catalog, "category")}|{provider.Name}|{provider.Value}";
                    Require(providerKeys.Add(key), "La colección contiene obras duplicadas del mismo catálogo.");
                }
        }
        var folderIds = new HashSet<string>(StringComparer.Ordinal);
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var folder in data.Folders!)
        {
            Require(folder is not null && IdValido(folder.Id), "Carpeta inválida.");
            Require(folderIds.Add(folder!.Id) && !string.IsNullOrWhiteSpace(folder.Name) && folder.Name.Length <= 60
                && names.Add(folder.Name.Trim()), "Nombre de carpeta inválido o repetido.");
            Require(folder.TitleIds is not null && folder.TitleIds.Count <= data.Library.Count
                && folder.TitleIds.Distinct(StringComparer.Ordinal).Count() == folder.TitleIds.Count
                && folder.TitleIds.All(data.Library.ContainsKey), "La carpeta contiene referencias inválidas.");
        }
    }

    private static bool TryGetInt32Safe(this JsonElement value, out int number)
    {
        number = 0;
        return value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out number);
    }
}

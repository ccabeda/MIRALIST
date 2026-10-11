using System.Text.Json;

namespace Miralist.Application.DTOs.Biblioteca;

public class ColeccionDto
{
    public Guid Version { get; set; }
    public Dictionary<string, EntradaDto> Library { get; set; } = [];
    public List<CarpetaDto> Folders { get; set; } = [];
}

public class EntradaDto
{
    public string Status { get; set; } = "Pendiente";
    public int Progress { get; set; }
    public int Score { get; set; }
    public bool Favorite { get; set; }
    public string Notes { get; set; } = "";
    public string StartDate { get; set; } = "";
    public string FinishDate { get; set; } = "";
    public string? WatchedDate { get; set; }
    public string? AddedAt { get; set; }
    public Dictionary<string, int>? SeasonProgress { get; set; }
    public JsonElement Catalog { get; set; }
}

public class CarpetaDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public List<string> TitleIds { get; set; } = [];
}

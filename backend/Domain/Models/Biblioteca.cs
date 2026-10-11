namespace Miralist.Domain.Models;

public class BibliotecaRevision
{
    public Guid UsuarioId { get; set; }
    public Guid Version { get; set; }
}

public class EntradaBiblioteca
{
    public Guid UsuarioId { get; set; }
    public string ObraId { get; set; } = "";
    public string Estado { get; set; } = "Pendiente";
    public int CapitulosVistos { get; set; }
    public int Puntuacion { get; set; }
    public bool Favorito { get; set; }
    public string Notas { get; set; } = "";
    public string FechaInicio { get; set; } = "";
    public string FechaFin { get; set; } = "";
    public string? FechaVista { get; set; }
    public string? AgregadoUtc { get; set; }
    public string? TemporadasJson { get; set; }
    public string CatalogoJson { get; set; } = "{}";
}

public class Carpeta
{
    public Guid UsuarioId { get; set; }
    public string Id { get; set; } = "";
    public string Nombre { get; set; } = "";
    public int Posicion { get; set; }
    public List<ObraEnCarpeta> Obras { get; set; } = [];
}

public class ObraEnCarpeta
{
    public Guid UsuarioId { get; set; }
    public string CarpetaId { get; set; } = "";
    public string ObraId { get; set; } = "";
    public int Posicion { get; set; }
}

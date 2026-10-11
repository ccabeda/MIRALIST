using System.Text.Json;
using Miralist.Application.DTOs.Biblioteca;
using Miralist.Application.Exceptions;
using Miralist.Application.Validations;
using Xunit;

namespace Miralist.API.Tests;

public class FolderValidationTests
{
    [Theory]
    [InlineData("Anime", "Series", false)]
    [InlineData("Anime", "Películas", false)]
    [InlineData("Series", "Películas", true)]
    [InlineData("Anime", "Anime", true)]
    public void FoldersRespectLibraryType(string first, string second, bool valid)
    {
        var data = new ColeccionDto();
        foreach (var (id, category) in new[] { ("a", first), ("b", second) })
            data.Library[id] = new EntradaDto { Catalog = JsonSerializer.SerializeToElement(new { id, title = id, category }) };
        data.Folders.Add(new CarpetaDto { Id = "folder", Name = "Carpeta", TitleIds = ["a", "b"] });
        if (valid) BibliotecaValidation.Validate(data);
        else Assert.Throws<AuthException>(() => BibliotecaValidation.Validate(data));
    }
}

using Miralist.Application.DTOs.Biblioteca;
using Miralist.Application.IRepository;
using Miralist.Application.Validations;

namespace Miralist.Application.UseCases.Biblioteca;

public record ObtenerBibliotecaQuery(Guid UsuarioId);
public record GuardarBibliotecaCommand(Guid UsuarioId, ColeccionDto Coleccion);

public class ObtenerBibliotecaHandler(IBibliotecaRepository repository)
{
    public Task<ColeccionDto> Handle(ObtenerBibliotecaQuery query, CancellationToken ct) => repository.Obtener(query.UsuarioId, ct);
}

public class GuardarBibliotecaHandler(IBibliotecaRepository repository)
{
    public Task<Guid> Handle(GuardarBibliotecaCommand command, CancellationToken ct)
    {
        BibliotecaValidation.Validate(command.Coleccion);
        return repository.Guardar(command.UsuarioId, command.Coleccion, ct);
    }
}

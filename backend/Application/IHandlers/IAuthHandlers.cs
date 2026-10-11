using Miralist.Application.DTOs.Auth;
using Miralist.Application.UseCases.Auth.Commands;
using Miralist.Application.UseCases.Auth.Queries;

namespace Miralist.Application.IHandlers;

public interface IRegistrarUsuarioHandler
{
    Task<SesionDto> Handle(RegistrarUsuarioCommand command, CancellationToken ct);
}
public interface IIniciarSesionHandler
{
    Task<SesionDto> Handle(IniciarSesionCommand command, CancellationToken ct);
}
public interface IUsuarioActualHandler
{
    Task<UsuarioDto?> Handle(UsuarioActualQuery query, CancellationToken ct);
}
public interface ICerrarSesionHandler
{
    Task Handle(CerrarSesionCommand command, CancellationToken ct);
}

using Miralist.Application.DTOs.Auth;

namespace Miralist.Application.UseCases.Auth.Commands;

public record RegistrarUsuarioCommand(RegistroDto Datos);
public record IniciarSesionCommand(LoginDto Datos);
public record CerrarSesionCommand(Guid SesionId);

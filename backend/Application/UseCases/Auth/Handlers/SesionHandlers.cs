using Miralist.Application.DTOs.Auth;
using Miralist.Application.IHandlers;
using Miralist.Application.IRepository;
using Miralist.Application.UseCases.Auth.Commands;
using Miralist.Application.UseCases.Auth.Queries;

namespace Miralist.Application.UseCases.Auth.Handlers;

public class UsuarioActualHandler(IUsuarioRepository usuarios) : IUsuarioActualHandler
{
    public async Task<UsuarioDto?> Handle(UsuarioActualQuery query, CancellationToken ct)
    {
        var usuario = await usuarios.PorId(query.UsuarioId, ct);
        return usuario is null ? null : new(usuario.Id, usuario.Nombre, usuario.Email, usuario.EmailVerificado, usuario.EmailPendiente);
    }
}

public class CerrarSesionHandler(ISesionRepository sesiones) : ICerrarSesionHandler
{
    public Task Handle(CerrarSesionCommand command, CancellationToken ct) => sesiones.Revocar(command.SesionId, ct);
}

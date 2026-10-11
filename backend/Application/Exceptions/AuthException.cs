namespace Miralist.Application.Exceptions;

public class AuthException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

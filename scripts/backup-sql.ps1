param([string]$Server = '.\SQLEXPRESS', [ValidateRange(1, 365)][int]$RetentionDays = 7,
    [string]$BackupDirectory = (Join-Path $env:LOCALAPPDATA 'MIRALIST\Backups'))
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$statusDirectory = Join-Path $projectRoot 'backend\API\App_Data'
$statusFile = Join-Path $statusDirectory 'backup-status.json'
$connection = New-Object System.Data.SqlClient.SqlConnection
$connection.ConnectionString = "Server=$Server;Database=master;Integrated Security=True;Encrypt=True;TrustServerCertificate=True"
function Invoke-BackupSql([string]$Query, [string]$FilePath) {
    $command = $connection.CreateCommand()
    $command.CommandText = $Query
    $command.CommandTimeout = 600
    if ($FilePath) { [void]$command.Parameters.AddWithValue('@path', $FilePath) }
    try { [void]$command.ExecuteNonQuery() } finally { $command.Dispose() }
}
try {
    $connection.Open()
    if (-not [IO.Path]::IsPathRooted($BackupDirectory)) { throw 'La carpeta de backup debe ser absoluta.' }
    $backupDirectory = [IO.Path]::GetFullPath($BackupDirectory)
    if (-not (Test-Path -LiteralPath $backupDirectory)) { throw "No existe la carpeta preparada: $backupDirectory" }
    if ((Get-Item -LiteralPath $backupDirectory).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'No se permiten enlaces en la carpeta de copias.' }
    $fileName = 'Miralist_' + (Get-Date -Format 'yyyyMMdd_HHmmss_fff') + '.bak'
    $backupPath = Join-Path $backupDirectory $fileName
    Invoke-BackupSql 'BACKUP DATABASE [Miralist] TO DISK = @path WITH COPY_ONLY, CHECKSUM, STOP_ON_ERROR;' $backupPath
    Invoke-BackupSql 'RESTORE VERIFYONLY FROM DISK = @path WITH CHECKSUM;' $backupPath
    # Retention runs only after a new backup has been verified successfully.
    $limit = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -LiteralPath $backupDirectory -File | Where-Object {
        $_.Name -match '^Miralist_\d{8}_\d{6}_\d{3}\.bak$' -and $_.LastWriteTime -lt $limit
    } | ForEach-Object {
        $resolved = [IO.Path]::GetFullPath($_.FullName)
        if ([IO.Path]::GetDirectoryName($resolved) -ne $backupDirectory -or
            ($_.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Ruta inesperada durante la retención.' }
        Remove-Item -LiteralPath $resolved
    }
    @{ ok = $true; completedAt = (Get-Date).ToString('o'); database = 'Miralist'; path = $backupPath } |
        ConvertTo-Json | Set-Content -LiteralPath $statusFile -Encoding UTF8
    Write-Output "Copia de Miralist verificada: $backupPath"
} catch {
    @{ ok = $false; attemptedAt = (Get-Date).ToString('o'); database = 'Miralist'; error = $_.Exception.Message } |
        ConvertTo-Json | Set-Content -LiteralPath $statusFile -Encoding UTF8
    throw
} finally { $connection.Dispose() }

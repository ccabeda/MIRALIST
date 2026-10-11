$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'backup-sql.ps1'
$taskName = 'MIRALIST - Backup SQL diario'
$owner = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$action = New-ScheduledTaskAction -Execute (Get-Command pwsh.exe -ErrorAction Stop).Source `
    -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $scriptPath + '"') `
    -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$trigger = New-ScheduledTaskTrigger -Daily -At '20:00'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10)
$principal = New-ScheduledTaskPrincipal -UserId $owner -LogonType Interactive -RunLevel Limited
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing -and ($existing.Actions.Arguments -notlike ('*"' + $scriptPath + '"*'))) {
    throw 'Existe otra tarea con el mismo nombre y distinta acción; no se reemplazó.'
}
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Principal $principal -Description 'Respaldo diario de Miralist en SQL Express; retiene 7 días. Requiere sesión de Windows iniciada.' -Force
Start-ScheduledTask -TaskName $taskName

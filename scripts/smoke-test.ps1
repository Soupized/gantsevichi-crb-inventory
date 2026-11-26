param(
  [string]$Port = '5191'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$root = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $root 'server'
$project = Join-Path $serverDir 'LibraryInventory.Api.csproj'
$dll = Join-Path $serverDir 'bin\Debug\net8.0\LibraryInventory.Api.dll'
$dotnet = Join-Path $env:USERPROFILE '.dotnet\dotnet.exe'
if (-not (Test-Path -LiteralPath $dotnet)) { $dotnet = 'dotnet' }

$base = "http://127.0.0.1:$Port"
$outLog = Join-Path $env:TEMP 'inventory-smoke-out.log'
$errLog = Join-Path $env:TEMP 'inventory-smoke-err.log'
$failures = 0
$process = $null

function Report([string]$name, [bool]$ok, [string]$detail = '') {
  if ($ok) {
    "PASS  $name"
  } else {
    $script:failures++
    "FAIL  $name $detail"
  }
}

function ResponseText($response) {
  $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
}

try {
  & $dotnet build $project -nologo | Out-Null
  Report 'build' $true

  $env:ASPNETCORE_ENVIRONMENT = 'Production'
  $process = Start-Process -FilePath $dotnet -ArgumentList @($dll, '--urls', $base) -WorkingDirectory $serverDir -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog

  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $probe = Invoke-WebRequest "$base/api/auth/status" -UseBasicParsing -TimeoutSec 2
      if ($probe.StatusCode -eq 200) { $ready = $true; break }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  Report 'startup' $ready

  if (-not $ready) {
    throw 'Server did not become ready.'
  }

  $handler = New-Object System.Net.Http.HttpClientHandler
  $handler.CookieContainer = New-Object System.Net.CookieContainer
  $client = New-Object System.Net.Http.HttpClient($handler)
  $client.BaseAddress = [Uri]$base

  $index = $client.GetAsync('/').GetAwaiter().GetResult()
  $indexText = ResponseText $index
  Report 'spa-index' ($index.StatusCode -eq 200 -and $indexText.Contains('id="root"'))

  $before = ResponseText ($client.GetAsync('/api/auth/status').GetAwaiter().GetResult()) | ConvertFrom-Json
  Report 'anonymous-status' ($before.authenticated -eq $false)

  $password = $env:INVENTORY_PASSWORD
  if ([string]::IsNullOrWhiteSpace($password)) {
    $passwordFile = Join-Path $serverDir 'auth-password.txt'
    if (-not (Test-Path -LiteralPath $passwordFile)) { throw 'Password is not configured and auth-password.txt is missing.' }
    $password = (Get-Content -LiteralPath $passwordFile -Raw).Trim()
  }

  $loginJson = @{ password = $password } | ConvertTo-Json -Compress
  $loginBody = New-Object System.Net.Http.StringContent($loginJson, [Text.Encoding]::UTF8, 'application/json')
  $login = $client.PostAsync('/api/auth/login', $loginBody).GetAwaiter().GetResult()
  Report 'login' ($login.StatusCode -eq 200)

  $after = ResponseText ($client.GetAsync('/api/auth/status').GetAwaiter().GetResult()) | ConvertFrom-Json
  Report 'authenticated-status' ($after.authenticated -eq $true)

  foreach ($endpoint in @('/api/computers', '/api/devices', '/api/computers?search=test', '/api/devices?search=test')) {
    $response = $client.GetAsync($endpoint).GetAwaiter().GetResult()
    Report "list $endpoint" ($response.StatusCode -eq 200)
  }

  $backup = $client.GetAsync('/api/backup/download').GetAwaiter().GetResult()
  $backupBytes = $backup.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  $header = if ($backupBytes.Length -ge 16) { [Text.Encoding]::ASCII.GetString($backupBytes, 0, 16) } else { '' }
  Report 'backup-download' ($backup.StatusCode -eq 200 -and $header.StartsWith('SQLite format 3'))

  $form = New-Object System.Net.Http.MultipartFormDataContent
  $fileContent = New-Object System.Net.Http.ByteArrayContent -ArgumentList (,$backupBytes)
  $fileContent.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::Parse('application/octet-stream')
  $form.Add($fileContent, 'file', 'smoke-backup.db')
  $restore = $client.PostAsync('/api/backup/restore', $form).GetAwaiter().GetResult()
  Report 'backup-restore' ($restore.StatusCode -eq 200)

  $reload = $client.GetAsync('/api/computers').GetAwaiter().GetResult()
  Report 'data-after-restore' ($reload.StatusCode -eq 200)

  $logout = $client.PostAsync('/api/auth/logout', $null).GetAwaiter().GetResult()
  $loggedOut = ResponseText ($client.GetAsync('/api/auth/status').GetAwaiter().GetResult()) | ConvertFrom-Json
  Report 'logout' ($logout.StatusCode -eq 200 -and $loggedOut.authenticated -eq $false)
}
catch {
  Report 'fatal' $false $_.Exception.Message
}
finally {
  if ($process -and -not $process.HasExited) {
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
  }

  if ($failures -gt 0) {
    '--- SERVER STDOUT ---'
    if (Test-Path -LiteralPath $outLog) { Get-Content -LiteralPath $outLog -Tail 60 }
    '--- SERVER STDERR ---'
    if (Test-Path -LiteralPath $errLog) { Get-Content -LiteralPath $errLog -Tail 60 }
  }
}

"RESULT failures=$failures"
if ($failures -gt 0) { exit 1 }
exit 0

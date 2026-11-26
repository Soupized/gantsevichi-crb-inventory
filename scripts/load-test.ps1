param(
  [int]$Count = 5000,
  [string]$Port = '5192',
  [int]$MaxListMs = 15000,
  [int]$MaxImportMs = 120000
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http

$root = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $root 'server'
$project = Join-Path $serverDir 'LibraryInventory.Api.csproj'
$dll = Join-Path $serverDir 'bin\Debug\net8.0\LibraryInventory.Api.dll'
$dotnet = Join-Path $env:USERPROFILE '.dotnet\dotnet.exe'
if (-not (Test-Path -LiteralPath $dotnet)) { $dotnet = 'dotnet' }

$workDir = Join-Path $env:TEMP 'inventory-load-test'
if (-not (Test-Path -LiteralPath $workDir)) { New-Item -ItemType Directory -Path $workDir | Out-Null }
$dbPath = Join-Path $workDir 'load-test.db'
$outLog = Join-Path $workDir 'server-out.log'
$errLog = Join-Path $workDir 'server-err.log'
$clientCsv = Join-Path $workDir 'computers.csv'
$deviceCsv = Join-Path $workDir 'devices.csv'
$password = 'LoadTestPass123!'
$base = "http://127.0.0.1:$Port"
$failures = 0
$process = $null
$oldConnection = $env:ConnectionStrings__Default
$oldPassword = $env:INVENTORY_PASSWORD
$client = $null

function Report([string]$name, [bool]$ok, [string]$detail = '') {
  if ($ok) {
    "PASS  $name $detail"
  } else {
    $script:failures++
    "FAIL  $name $detail"
  }
}

function ResponseText($response) {
  $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
}

function RestoreEnvironment {
  if ($null -eq $oldConnection) { Remove-Item Env:ConnectionStrings__Default -ErrorAction SilentlyContinue } else { $env:ConnectionStrings__Default = $oldConnection }
  if ($null -eq $oldPassword) { Remove-Item Env:INVENTORY_PASSWORD -ErrorAction SilentlyContinue } else { $env:INVENTORY_PASSWORD = $oldPassword }
}

try {
  Remove-Item -LiteralPath $dbPath, ($dbPath + '-wal'), ($dbPath + '-shm') -ErrorAction SilentlyContinue
  & $dotnet build $project -nologo | Out-Null
  Report 'build' $true

  $env:ConnectionStrings__Default = "Data Source=$dbPath;Foreign Keys=True"
  $env:INVENTORY_PASSWORD = $password
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
  if (-not $ready) { throw 'Server did not become ready.' }

  $handler = New-Object System.Net.Http.HttpClientHandler
  $handler.CookieContainer = New-Object System.Net.CookieContainer
  $client = New-Object System.Net.Http.HttpClient($handler)
  $client.BaseAddress = [Uri]$base
  $client.Timeout = [TimeSpan]::FromMinutes(5)

  $loginJson = @{ password = $password } | ConvertTo-Json -Compress
  $loginBody = New-Object System.Net.Http.StringContent($loginJson, [Text.Encoding]::UTF8, 'application/json')
  $login = $client.PostAsync('/api/auth/login', $loginBody).GetAwaiter().GetResult()
  Report 'login' ($login.StatusCode -eq 200)

  $utf8 = New-Object Text.UTF8Encoding($false)
  $computerLines = New-Object Collections.Generic.List[string]
  $deviceLines = New-Object Collections.Generic.List[string]
  $computerLines.Add('InventoryNumber,Status,Model,Processor,GraphicsCard,RamGb,Storage,Motherboard,OperatingSystem,Location,AssignedTo,CommissionedOn,DecommissionedOn,DecommissionReason,Notes')
  $deviceLines.Add('InventoryNumber,Status,Type,Manufacturer,Model,SerialNumber,ComputerInventoryNumber,DecommissionedOn,DecommissionReason,Notes')

  for ($i = 1; $i -le $Count; $i++) {
    $n = $i.ToString('D6')
    $needle = if ($i % 100 -eq 0) { "SearchNeedle-$n" } else { "Model-$n" }
    $computerLines.Add((@("LOAD-C-$n", 'InUse', $needle, "CPU-$n", "GPU-$n", '16', "SSD-$n", "MB-$n", 'Windows 11', "Room-$n", "User-$n", '', '', '', '') -join ','))
    $deviceLines.Add((@("LOAD-D-$n", 'InUse', 'Printer', "Brand-$n", $needle, "SN-$n", "LOAD-C-$n", '', '', '') -join ','))
  }

  [IO.File]::WriteAllText($clientCsv, (($computerLines -join "`n") + "`n"), $utf8)
  [IO.File]::WriteAllText($deviceCsv, (($deviceLines -join "`n") + "`n"), $utf8)
  Report 'csv-generated' $true "computers=$Count devices=$Count"

  function ImportCsv([string]$path, [string]$endpoint) {
    $bytes = [IO.File]::ReadAllBytes($path)
    $form = New-Object System.Net.Http.MultipartFormDataContent
    $content = New-Object System.Net.Http.ByteArrayContent -ArgumentList (,$bytes)
    $content.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::Parse('text/csv')
    $form.Add($content, 'file', [IO.Path]::GetFileName($path))
    $watch = [Diagnostics.Stopwatch]::StartNew()
    $response = $client.PostAsync($endpoint, $form).GetAwaiter().GetResult()
    $watch.Stop()
    $text = ResponseText $response
    $result = if ($text) { $text | ConvertFrom-Json } else { $null }
    [pscustomobject]@{ Status = [int]$response.StatusCode; Ms = [math]::Round($watch.Elapsed.TotalMilliseconds); Result = $result; Text = $text }
  }

  $computersImport = ImportCsv $clientCsv '/api/computers/import.csv'
  Report 'import-computers-status' ($computersImport.Status -eq 200) "ms=$($computersImport.Ms)"
  Report 'import-computers-result' ($computersImport.Result.created -eq $Count -and $computersImport.Result.errors.Count -eq 0) "created=$($computersImport.Result.created) errors=$($computersImport.Result.errors.Count)"
  Report 'import-computers-time' ($computersImport.Ms -le $MaxImportMs) "ms=$($computersImport.Ms)"

  $devicesImport = ImportCsv $deviceCsv '/api/devices/import.csv'
  Report 'import-devices-status' ($devicesImport.Status -eq 200) "ms=$($devicesImport.Ms)"
  Report 'import-devices-result' ($devicesImport.Result.created -eq $Count -and $devicesImport.Result.errors.Count -eq 0) "created=$($devicesImport.Result.created) errors=$($devicesImport.Result.errors.Count)"
  Report 'import-devices-time' ($devicesImport.Ms -le $MaxImportMs) "ms=$($devicesImport.Ms)"

  function MeasureGet([string]$name, [string]$endpoint, [int]$expectedCount) {
    $times = New-Object Collections.Generic.List[double]
    $payload = $null
    $status = 0
    for ($i = 0; $i -lt 3; $i++) {
      $watch = [Diagnostics.Stopwatch]::StartNew()
      $response = $client.GetAsync($endpoint).GetAwaiter().GetResult()
      $payload = $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
      $watch.Stop()
      $status = [int]$response.StatusCode
      $times.Add($watch.Elapsed.TotalMilliseconds)
      if ($status -ne 200) { break }
    }
    $max = [math]::Round(($times | Measure-Object -Maximum).Maximum)
    $avg = [math]::Round(($times | Measure-Object -Average).Average)
    Report "status $name" ($status -eq 200)
    if ($expectedCount -ge 0 -and $status -eq 200) {
      $items = [Text.Encoding]::UTF8.GetString($payload) | ConvertFrom-Json
      Report "count $name" (@($items).Count -eq $expectedCount) "expected=$expectedCount actual=$(@($items).Count)"
    }
    Report "time $name" ($max -le $MaxListMs) "avg=${avg}ms max=${max}ms bytes=$($payload.Length)"
  }

  MeasureGet 'computers-all' '/api/computers' $Count
  MeasureGet 'devices-all' '/api/devices' $Count
  MeasureGet 'computers-search' '/api/computers?search=SearchNeedle' ([math]::Ceiling($Count / 100.0))
  MeasureGet 'devices-search' '/api/devices?search=SearchNeedle' ([math]::Ceiling($Count / 100.0))
  MeasureGet 'computers-status' '/api/computers?status=InUse' $Count
  MeasureGet 'devices-type' '/api/devices?type=Printer' $Count
  MeasureGet 'devices-by-computer' '/api/devices?computerId=1' 1

  $duplicateCsv = 'InventoryNumber,Status,Type,Manufacturer,Model,SerialNumber,ComputerInventoryNumber,DecommissionedOn,DecommissionReason,Notes' + "`n" +
    'load-c-000001,InUse,Printer,Duplicate,Duplicate,SN-DUP,,,,'
  $duplicateBytes = [Text.Encoding]::UTF8.GetBytes($duplicateCsv)
  $duplicateForm = New-Object System.Net.Http.MultipartFormDataContent
  $duplicateContent = New-Object System.Net.Http.ByteArrayContent -ArgumentList (,$duplicateBytes)
  $duplicateContent.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::Parse('text/csv')
  $duplicateForm.Add($duplicateContent, 'file', 'duplicate.csv')
  $duplicateResponse = $client.PostAsync('/api/devices/import.csv', $duplicateForm).GetAwaiter().GetResult()
  $duplicateResult = ResponseText $duplicateResponse | ConvertFrom-Json
  Report 'cross-table-duplicate-rejected' ($duplicateResult.created -eq 0 -and $duplicateResult.errors.Count -gt 0) "created=$($duplicateResult.created) errors=$($duplicateResult.errors.Count)"
  MeasureGet 'after-conflict' '/api/computers' $Count

  $backupResponse = $client.GetAsync('/api/backup/download').GetAwaiter().GetResult()
  $backupBytes = $backupResponse.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  $backupHeader = if ($backupBytes.Length -ge 16) { [Text.Encoding]::ASCII.GetString($backupBytes, 0, 16) } else { '' }
  Report 'backup-download-large' ([int]$backupResponse.StatusCode -eq 200 -and $backupHeader.StartsWith('SQLite format 3')) "bytes=$($backupBytes.Length)"

  $restoreForm = New-Object System.Net.Http.MultipartFormDataContent
  $restoreContent = New-Object System.Net.Http.ByteArrayContent -ArgumentList (,$backupBytes)
  $restoreContent.Headers.ContentType = [Net.Http.Headers.MediaTypeHeaderValue]::Parse('application/octet-stream')
  $restoreForm.Add($restoreContent, 'file', 'large-backup.db')
  $restoreResponse = $client.PostAsync('/api/backup/restore', $restoreForm).GetAwaiter().GetResult()
  Report 'backup-restore-large' ([int]$restoreResponse.StatusCode -eq 200) "status=$([int]$restoreResponse.StatusCode)"
  MeasureGet 'after-restore' '/api/computers' $Count
}
catch {
  Report 'fatal' $false $_.Exception.Message
}
finally {
  RestoreEnvironment
  if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
  if ($client) { $client.Dispose() }

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

/**
 * Script do agente de coleta (PowerShell 5.1, que vem no Windows 10/11 e Server 2016+).
 *
 * Roda como tarefa agendada do Windows (conta SYSTEM, ao ligar e uma vez por dia) e envia
 * o hardware para registrar_coleta. Sem programa instalado, sem porta aberta: só uma
 * chamada HTTPS de saída.
 *
 * O texto não pode ter crase (`) — ela fecharia este template string — nem "${" —
 * que viraria interpolação. O PowerShell aqui usa só aspas simples e $variavel.
 */

/** Aspas simples do PowerShell: a única coisa a escapar é a própria aspa, dobrando-a. */
function literal(valor: string) {
  return `'${valor.replace(/'/g, "''")}'`;
}

export function montarScriptAgente(opcoes: {
  url: string;
  chavePublica: string;
  chaveColeta: string;
  cliente: string;
}) {
  // O nome do cliente vai num comentário: quebra de linha ou "#>" encerrariam o bloco.
  const cliente = opcoes.cliente.replace(/[\r\n]+/g, " ").replace(/#>/g, "");
  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const linhas = `<#
  Masterbit Suport - coleta de inventario
  Cliente: ${cliente}
  Gerado em: ${geradoEm}

  INSTALAR (PowerShell como administrador, na pasta onde salvou este arquivo):
    powershell -ExecutionPolicy Bypass -File .\\coletar-inventario.ps1 -Instalar

  VER O QUE SERIA ENVIADO (nao envia nada):
    powershell -ExecutionPolicy Bypass -File .\\coletar-inventario.ps1 -Mostrar

  REMOVER:
    powershell -ExecutionPolicy Bypass -File .\\coletar-inventario.ps1 -Remover

  O que e coletado: nome do computador, fabricante, modelo, numero de serie, sistema
  operacional, processador, memoria, discos, espaco livre, rede (IP e MAC) e usuario
  logado. Nada de arquivos, senhas, documentos ou programas.

  Este arquivo contem a chave de coleta deste cliente. Nao compartilhe fora dele.
  Se vazar, revogue a chave no Masterbit Suport (ficha do cliente, aba Equipamentos).
#>
param([switch]$Instalar, [switch]$Remover, [switch]$Mostrar)

$ErrorActionPreference = 'Stop'
$Url          = ${literal(opcoes.url.replace(/\/+$/, ""))}
$ChavePublica = ${literal(opcoes.chavePublica)}
$ChaveColeta  = ${literal(opcoes.chaveColeta)}
$Pasta        = Join-Path $env:ProgramData 'MasterbitSuport'
$Tarefa       = 'Masterbit Suport - Inventario'
$Log          = Join-Path $Pasta 'ultimo-envio.txt'

function Texto($valor) {
  if ($null -eq $valor) { return $null }
  return ([string]$valor).Trim()
}

function Obter-Inventario {
  $cs   = Get-CimInstance Win32_ComputerSystem
  $bios = Get-CimInstance Win32_BIOS
  $os   = Get-CimInstance Win32_OperatingSystem
  $cpu  = @(Get-CimInstance Win32_Processor)
  $memoria = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum
  $guid = (Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography' -Name MachineGuid).MachineGuid
  $temBateria = @(Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue).Count -gt 0
  if ($os.ProductType -ne 1) { $tipo = 'servidor' } elseif ($temBateria) { $tipo = 'notebook' } else { $tipo = 'computador' }

  $discos = @(Get-CimInstance Win32_DiskDrive | ForEach-Object {
    @{ modelo = (Texto $_.Model); tamanho_gb = [math]::Round($_.Size / 1GB); interface = (Texto $_.InterfaceType) }
  })
  $volumes = @(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
    @{ letra = $_.DeviceID; total_gb = [math]::Round($_.Size / 1GB, 1); livre_gb = [math]::Round($_.FreeSpace / 1GB, 1) }
  })
  $rede = @(Get-CimInstance Win32_NetworkAdapterConfiguration -Filter 'IPEnabled=True' | ForEach-Object {
    $ipv4 = @($_.IPAddress) | Where-Object { $_ -notmatch ':' } | Select-Object -First 1
    @{ descricao = (Texto $_.Description); ip = $ipv4; mac = $_.MACAddress }
  })

  return [ordered]@{
    identificador       = $guid
    nome                = $env:COMPUTERNAME
    tipo                = $tipo
    dominio             = (Texto $cs.Domain)
    usuario             = (Texto $cs.UserName)
    fabricante          = (Texto $cs.Manufacturer)
    modelo              = (Texto $cs.Model)
    numero_serie        = (Texto $bios.SerialNumber)
    sistema_operacional = (Texto $os.Caption)
    versao_so           = (Texto $os.Version)
    processador         = (Texto $cpu[0].Name)
    nucleos             = [int](($cpu | Measure-Object -Property NumberOfCores -Sum).Sum)
    memoria_mb          = [int]([math]::Round($memoria / 1MB))
    discos              = $discos
    volumes             = $volumes
    rede                = $rede
  }
}

function Enviar-Inventario {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $corpo = @{ p_chave = $ChaveColeta; p_dados = (Obter-Inventario) } | ConvertTo-Json -Depth 6 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($corpo)
  return Invoke-RestMethod -Method Post -Uri ($Url + '/rest/v1/rpc/registrar_coleta') -Headers @{ apikey = $ChavePublica } -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 60
}

function Registrar($texto) {
  try {
    if (-not (Test-Path $Pasta)) { New-Item -ItemType Directory -Force -Path $Pasta | Out-Null }
    ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $texto) | Set-Content -Path $Log -Encoding UTF8
  } catch { }
}

function Executar-Envio {
  try {
    $resposta = Enviar-Inventario
    Registrar ('ok: ' + $resposta)
    return $true
  } catch {
    $detalhe = $_.Exception.Message
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $detalhe = $_.ErrorDetails.Message }
    Registrar ('erro: ' + $detalhe)
    Write-Host ('Falha no envio: ' + $detalhe) -ForegroundColor Red
    return $false
  }
}

function E-Administrador {
  $identidade = [Security.Principal.WindowsIdentity]::GetCurrent()
  return ([Security.Principal.WindowsPrincipal]$identidade).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if ($Mostrar) {
  Obter-Inventario | ConvertTo-Json -Depth 6
  exit 0
}

if ($Remover) {
  if (-not (E-Administrador)) { Write-Host 'Abra o PowerShell como administrador.' -ForegroundColor Red; exit 1 }
  Unregister-ScheduledTask -TaskName $Tarefa -Confirm:$false -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $Pasta -ErrorAction SilentlyContinue
  Write-Host 'Coleta removida deste computador.' -ForegroundColor Green
  exit 0
}

if ($Instalar) {
  if (-not (E-Administrador)) { Write-Host 'Abra o PowerShell como administrador.' -ForegroundColor Red; exit 1 }
  New-Item -ItemType Directory -Force -Path $Pasta | Out-Null
  $destino = Join-Path $Pasta 'coletar-inventario.ps1'
  Copy-Item -Path $PSCommandPath -Destination $destino -Force
  # Pasta legivel so por SYSTEM e administradores: o arquivo contem a chave de coleta.
  # SIDs em vez de nomes porque o nome do grupo muda com o idioma do Windows.
  icacls $Pasta /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null

  $argumentos = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $destino + '"'
  $acao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argumentos
  $aoLigar = New-ScheduledTaskTrigger -AtStartup
  $aoLigar.Delay = 'PT5M'
  $diario = New-ScheduledTaskTrigger -Daily -At '12:00'
  $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
  $config = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
  Register-ScheduledTask -TaskName $Tarefa -Action $acao -Trigger @($aoLigar, $diario) -Principal $principal -Settings $config -Force | Out-Null

  Write-Host 'Tarefa agendada criada. Enviando a primeira coleta...'
  if (Executar-Envio) { Write-Host 'Pronto: este computador ja aparece no Masterbit Suport.' -ForegroundColor Green }
  exit 0
}

if (Executar-Envio) { exit 0 } else { exit 1 }
`;

  // CRLF: o Bloco de Notas antigo e alguns editores do Windows estranham LF puro.
  return linhas.replace(/\r?\n/g, "\r\n");
}

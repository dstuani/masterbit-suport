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

/** Servidor e senha do RustDesk. Sem os dois, o script não instala o RustDesk (só lê o ID, se houver). */
export type RustDeskDoScript = { config: string; senha: string };

export function montarScriptAgente(opcoes: {
  url: string;
  chavePublica: string;
  chaveColeta: string;
  cliente: string;
  rustdesk: RustDeskDoScript | null;
}) {
  // O nome do cliente vai num comentário: quebra de linha ou "#>" encerrariam o bloco.
  const cliente = opcoes.cliente.replace(/[\r\n]+/g, " ").replace(/#>/g, "");
  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const textoRustDesk = opcoes.rustdesk
    ? `  RUSTDESK: o -Instalar tambem baixa o RustDesk do GitHub oficial (confere a assinatura
  digital), instala como servico, aponta para o servidor Masterbit e define a senha de
  acesso deste cliente. A copia instalada em ProgramData fica SEM a senha.
  Depois de instalar, apague este arquivo do pen drive ou da pasta: ele contem a senha.
  O -Remover nao desinstala o RustDesk.`
    : `  RUSTDESK: servidor ou senha nao configurados no Masterbit Suport quando este arquivo
  foi gerado. O script nao instala o RustDesk; se ele ja existir, so envia o ID.`;

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
  operacional, processador, memoria, discos, espaco livre, rede (IP e MAC), usuario
  logado e o ID do RustDesk. Nada de arquivos, senhas, documentos ou programas.

${textoRustDesk}

  Este arquivo contem a chave de coleta deste cliente. Nao compartilhe fora dele.
  Se vazar, revogue a chave no Masterbit Suport (ficha do cliente, aba Equipamentos)
  e troque a senha do RustDesk do cliente.
#>
param([switch]$Instalar, [switch]$Remover, [switch]$Mostrar)

$ErrorActionPreference = 'Stop'
$Url          = ${literal(opcoes.url.replace(/\/+$/, ""))}
$ChavePublica = ${literal(opcoes.chavePublica)}
$ChaveColeta  = ${literal(opcoes.chaveColeta)}
$Pasta        = Join-Path $env:ProgramData 'MasterbitSuport'
$Tarefa       = 'Masterbit Suport - Inventario'
$Log          = Join-Path $Pasta 'ultimo-envio.txt'
$RustDeskConfig = ${literal(opcoes.rustdesk?.config ?? "")}
$RustDeskSenha = ${literal(opcoes.rustdesk?.senha ?? "")}
$RustDeskExe  = Join-Path $env:ProgramFiles 'RustDesk\\rustdesk.exe'

function Texto($valor) {
  if ($null -eq $valor) { return $null }
  return ([string]$valor).Trim()
}

# Roda o rustdesk.exe com tempo limite: um travamento nao pode prender a tarefa agendada.
function Executar-RustDesk([string[]]$argumentos, [switch]$Saida) {
  $arquivo = Join-Path $env:TEMP ('mbs-rustdesk-' + [guid]::NewGuid().ToString('N') + '.txt')
  try {
    if ($Saida) {
      $processo = Start-Process -FilePath $RustDeskExe -ArgumentList $argumentos -NoNewWindow -PassThru -RedirectStandardOutput $arquivo
    } else {
      $processo = Start-Process -FilePath $RustDeskExe -ArgumentList $argumentos -NoNewWindow -PassThru
    }
    if (-not $processo.WaitForExit(30000)) {
      try { $processo.Kill() } catch { }
      return $null
    }
    if ($Saida -and (Test-Path $arquivo)) { return (Get-Content -Path $arquivo -Raw) }
    return ''
  } finally {
    Remove-Item -Path $arquivo -Force -ErrorAction SilentlyContinue
  }
}

function Obter-RustDeskId {
  try {
    if (-not (Test-Path $RustDeskExe)) { return $null }
    $id = Executar-RustDesk @('--get-id') -Saida
    if ($null -eq $id) { return $null }
    $id = $id -replace '\\s', ''
    if ($id -match '^[A-Za-z0-9_-]{6,32}$') { return $id }
    return $null
  } catch {
    return $null
  }
}

function Instalar-RustDesk {
  if (-not $RustDeskConfig -or -not $RustDeskSenha) {
    Write-Host 'RustDesk: servidor ou senha nao configurados no Masterbit Suport. Instalacao pulada.' -ForegroundColor Yellow
    return
  }
  try {
    if (-not (Test-Path $RustDeskExe)) {
      Write-Host 'RustDesk: baixando a versao mais recente do GitHub oficial...'
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      $versao = Invoke-RestMethod -Uri 'https://api.github.com/repos/rustdesk/rustdesk/releases/latest' -Headers @{ 'User-Agent' = 'MasterbitSuport' } -TimeoutSec 60
      $pacote = @($versao.assets | Where-Object { $_.name -match '^rustdesk-[0-9.]+-x86_64\\.exe$' }) | Select-Object -First 1
      if (-not $pacote) { throw ('instalador nao encontrado na versao ' + $versao.tag_name) }

      $instalador = Join-Path $env:TEMP $pacote.name
      Invoke-WebRequest -Uri $pacote.browser_download_url -OutFile $instalador -UseBasicParsing -TimeoutSec 600
      # Arquivo sem assinatura digital valida nao roda: protege contra download adulterado.
      $assinatura = Get-AuthenticodeSignature -FilePath $instalador
      if ($assinatura.Status -ne 'Valid') {
        Remove-Item -Path $instalador -Force -ErrorAction SilentlyContinue
        throw ('assinatura digital do instalador invalida (' + $assinatura.Status + ')')
      }

      Write-Host ('RustDesk: instalando ' + $versao.tag_name + '...')
      # Sem -Wait: o instalador deixa o RustDesk aberto e o Start-Process esperaria por ele.
      Start-Process -FilePath $instalador -ArgumentList '--silent-install'
      $limite = (Get-Date).AddMinutes(3)
      while (-not (Test-Path $RustDeskExe) -and (Get-Date) -lt $limite) { Start-Sleep -Seconds 3 }
      if (-not (Test-Path $RustDeskExe)) { throw 'a instalacao nao terminou em 3 minutos' }
      Start-Sleep -Seconds 15
      Remove-Item -Path $instalador -Force -ErrorAction SilentlyContinue
    }

    if (-not (Get-Service -Name 'RustDesk' -ErrorAction SilentlyContinue)) {
      Start-Process -FilePath $RustDeskExe -ArgumentList '--install-service'
      Start-Sleep -Seconds 20
    }
    Start-Service -Name 'RustDesk' -ErrorAction SilentlyContinue

    Executar-RustDesk @('--config', $RustDeskConfig) | Out-Null
    Executar-RustDesk @('--password', $RustDeskSenha) | Out-Null
    Write-Host 'RustDesk instalado, apontado para o servidor Masterbit e com a senha do cliente.' -ForegroundColor Green
  } catch {
    Write-Host ('RustDesk: ' + $_.Exception.Message) -ForegroundColor Red
    Write-Host 'A coleta de inventario segue normalmente.' -ForegroundColor Yellow
  }
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
    rustdesk_id         = (Obter-RustDeskId)
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
  Instalar-RustDesk

  New-Item -ItemType Directory -Force -Path $Pasta | Out-Null
  $destino = Join-Path $Pasta 'coletar-inventario.ps1'
  # A copia que fica na maquina vai sem a senha do RustDesk: a coleta diaria nao precisa dela.
  $conteudo = [IO.File]::ReadAllLines($PSCommandPath) | ForEach-Object {
    if ($_ -like '$RustDeskSenha *') { '$RustDeskSenha = ' + "''" } else { $_ }
  }
  [IO.File]::WriteAllLines($destino, [string[]]$conteudo, (New-Object Text.UTF8Encoding $true))
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
  if ($RustDeskSenha) {
    Write-Host 'Lembrete: apague este arquivo de onde voce o copiou. Ele contem a senha do RustDesk.' -ForegroundColor Yellow
  }
  exit 0
}

if (Executar-Envio) { exit 0 } else { exit 1 }
`;

  // CRLF: o Bloco de Notas antigo e alguns editores do Windows estranham LF puro.
  return linhas.replace(/\r?\n/g, "\r\n");
}

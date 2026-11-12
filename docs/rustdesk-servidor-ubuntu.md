# Servidor RustDesk próprio num Ubuntu da rede local

Guia para trocar o AnyDesk por RustDesk com servidor próprio, rodando num Ubuntu em casa.
Conferido com a documentação oficial do RustDesk em 06/11/2026.

Tempo estimado: 1 a 2 horas na primeira vez.

---

## Etapa 0 — Antes de tudo: o IP é público?

Sem IP público nada do resto funciona.

1. Entre no painel do roteador e anote o **IP WAN** (ou "IP da internet").
2. No celular **ligado ao Wi-Fi de casa**, abra `meuip.com.br` e anote o IP.
3. Compare:
   - **Iguais** → IP público. Siga em frente.
   - **Diferentes**, ou o IP WAN começa com `100.64`–`100.127`, `10.` ou `192.168` → **CGNAT**.
     Ligue para o provedor e peça "IP público" (às vezes falam "IP válido" ou "IP fixo"). Sem isso,
     use uma VPS em vez de casa.

Se o roteador do provedor estiver em modo roteador e houver outro roteador seu atrás dele (duplo NAT),
o redirecionamento precisa ser feito nos dois, ou o do provedor deve ir para modo bridge.

---

## Etapa 1 — Preparar o Ubuntu

Qualquer Ubuntu Server 22.04 ou 24.04 serve (1 GB de RAM sobra). Tudo abaixo é no terminal do Ubuntu.

### 1.1 Atualizar

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Deixar o IP local fixo

O jeito mais simples é no **roteador**: em DHCP → "Reserva de endereço" (ou "IP estático por MAC"),
fixe um IP para o Ubuntu, por exemplo `192.168.0.50`. Descubra o MAC com:

```bash
ip -br link
```

(Alternativa: fixar no próprio Ubuntu pelo netplan. Prefira o roteador — fica num lugar só.)

Reinicie o Ubuntu e confira se pegou o IP reservado:

```bash
ip -br addr
```

### 1.3 Instalar o Docker

```bash
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

Teste:

```bash
sudo docker compose version
```

---

## Etapa 2 — Subir o servidor RustDesk

### 2.1 Pasta e arquivo de configuração

```bash
sudo mkdir -p /opt/rustdesk
cd /opt/rustdesk
sudo nano compose.yml
```

Cole exatamente isto e salve (Ctrl+O, Enter, Ctrl+X):

```yaml
services:
  hbbs:
    container_name: hbbs
    image: rustdesk/rustdesk-server:latest
    command: hbbs
    volumes:
      - ./data:/root
    network_mode: "host"
    depends_on:
      - hbbr
    restart: unless-stopped

  hbbr:
    container_name: hbbr
    image: rustdesk/rustdesk-server:latest
    command: hbbr
    volumes:
      - ./data:/root
    network_mode: "host"
    restart: unless-stopped
```

### 2.2 Ligar

```bash
sudo docker compose up -d
sudo docker compose ps
```

Os dois (`hbbs` e `hbbr`) devem aparecer como "running". Eles voltam sozinhos se o Ubuntu reiniciar.

### 2.3 Pegar a chave pública

Na primeira execução o servidor gera um par de chaves na pasta `data`:

```bash
sudo cat /opt/rustdesk/data/id_ed25519.pub
```

Copie a linha que aparecer (algo como `Wk3x...=`). Essa é a **Key** que vai em todos os clientes.

> **Backup obrigatório:** guarde uma cópia da pasta `/opt/rustdesk/data` (principalmente
> `id_ed25519` e `id_ed25519.pub`) fora do Ubuntu. Se perder essa chave, todos os computadores
> dos clientes precisam ser reconfigurados.

---

## Etapa 3 — Firewall no Ubuntu

Troque `192.168.0.0/24` pela faixa da sua rede, se for outra.

```bash
sudo ufw allow from 192.168.0.0/24 to any port 22 proto tcp
sudo ufw allow 21115:21117/tcp
sudo ufw allow 21116/udp
sudo ufw enable
sudo ufw status
```

Isso deixa o SSH só para dentro de casa e libera para a internet apenas o necessário ao RustDesk.
As portas 21118 e 21119 (cliente web) ficam fechadas de propósito.

---

## Etapa 4 — Redirecionar as portas no roteador

No roteador: "Redirecionamento de portas", "Port forwarding", "NAT" ou "Servidor virtual".
Crie estas regras apontando para o IP do Ubuntu (ex.: `192.168.0.50`):

| Porta externa | Porta interna | Protocolo |
|---|---|---|
| 21115–21117 | 21115–21117 | TCP |
| 21116 | 21116 | UDP |

Se o roteador não aceitar faixa, crie uma regra para cada porta (21115, 21116, 21117 em TCP e 21116 em UDP).

---

## Etapa 5 — Nome fixo (DDNS) com DuckDNS

Exemplo com DuckDNS, que é gratuito. (Se o roteador tiver DDNS embutido com No-IP ou similar,
pode usar o dele e pular esta etapa.)

1. Acesse `duckdns.org`, entre com uma conta Google/GitHub e crie um subdomínio,
   por exemplo `masterbit-suporte` → `masterbit-suporte.duckdns.org`.
2. Copie o **token** que aparece no topo da página.
3. No Ubuntu, crie o atualizador (troque `SUBDOMINIO` e `TOKEN`):

```bash
mkdir -p ~/duckdns
cat > ~/duckdns/duck.sh << 'EOF'
#!/bin/sh
echo url="https://www.duckdns.org/update?domains=SUBDOMINIO&token=TOKEN&ip=" | curl -s -o ~/duckdns/duck.log -K -
EOF
chmod 700 ~/duckdns/duck.sh
~/duckdns/duck.sh && cat ~/duckdns/duck.log
```

Tem que aparecer `OK`. Agora agende para rodar a cada 5 minutos:

```bash
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -
```

> Quer usar um nome seu (ex.: `suporte.masterbit.online`)? Crie no DNS da Hostinger um registro
> **CNAME** `suporte` → `masterbit-suporte.duckdns.org`. Use esse nome no lugar do DuckDNS daqui em diante.

---

## Etapa 6 — Testar com um cliente

1. Baixe o RustDesk para Windows em `github.com/rustdesk/rustdesk/releases` (arquivo `rustdesk-…-x86_64.exe`).
2. Abra, clique nos **três pontinhos ao lado do ID → Rede** (Network), desbloqueie e preencha:
   - **Servidor de ID:** `masterbit-suporte.duckdns.org`
   - **Servidor de Relay:** deixe vazio (ele deduz) ou `masterbit-suporte.duckdns.org`
   - **Key:** a chave da etapa 2.3
   - **API:** vazio (só existe na versão Pro)
3. Aplique. No rodapé da janela deve aparecer **"Pronto"** (Ready). Se ficar tentando conectar,
   veja a seção de problemas abaixo.

**Teste de verdade:** faça a conexão com um dos lados **fora de casa** (notebook no 4G do celular,
ou a máquina de um cliente). Testar com os dois dentro de casa não prova que o redirecionamento funciona.

### Exportar a configuração para os próximos

No cliente já configurado: Configurações → Rede → desbloquear → **Exportar configuração do servidor**.
Sai uma linha de texto (a *config string*). Guarde — é ela que o script da etapa 7 usa, e qualquer
pessoa pode colar em **Importar configuração do servidor** em vez de digitar servidor e chave.

---

## Etapa 7 — Instalar nos computadores dos clientes (acesso sem ninguém na frente)

Script PowerShell, para rodar **como administrador** na máquina do cliente, com o instalador
do RustDesk na mesma pasta, renomeado para `rustdesk-instalador.exe`.

Salve como `instalar-rustdesk.ps1` e preencha `$config` com a config string da etapa 6:

```powershell
# Instala o RustDesk, aponta para o servidor Masterbit e define senha permanente.
$config = 'COLE_AQUI_A_CONFIG_STRING'

# Senha aleatória por máquina: anote junto com o ID.
$senha = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 14 | ForEach-Object { [char]$_ })

Start-Process -FilePath '.\rustdesk-instalador.exe' -ArgumentList '--silent-install'
Start-Sleep -Seconds 20

Set-Location "$env:ProgramFiles\RustDesk"

if (-not (Get-Service -Name 'RustDesk' -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath '.\rustdesk.exe' -ArgumentList '--install-service'
    Start-Sleep -Seconds 20
}
Start-Service -Name 'RustDesk' -ErrorAction SilentlyContinue

.\rustdesk.exe --config $config
.\rustdesk.exe --password $senha
$id = (.\rustdesk.exe --get-id | Out-String).Trim()

Write-Output ''
Write-Output "Computador: $env:COMPUTERNAME"
Write-Output "ID RustDesk: $id"
Write-Output "Senha:       $senha"
```

Para rodar (PowerShell como administrador, na pasta dos arquivos):

```powershell
powershell -ExecutionPolicy Bypass -File .\instalar-rustdesk.ps1
```

Anote **ID e senha** de cada máquina. (Próximo passo planejado: o agente de coleta do Masterbit Suport
fazer isso sozinho e gravar o ID na ficha do equipamento, com botão "Conectar".)

### Atendimento avulso (cliente sem RustDesk instalado)

O cliente baixa o RustDesk, abre sem instalar e você passa a config string para ele colar em
Configurações → Rede → **Importar configuração do servidor**. Depois ele te informa o ID e a senha
que aparecem na tela.

---

## Manutenção

**Atualizar o servidor** (a cada um ou dois meses):

```bash
cd /opt/rustdesk
sudo docker compose pull
sudo docker compose up -d
```

**Ver os registros** quando algo não conecta:

```bash
cd /opt/rustdesk
sudo docker compose logs --tail 50
```

**Backup:** sempre que mexer no servidor, copie `/opt/rustdesk/data` para fora da máquina.

---

## Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Cliente não fica "Pronto" | porta não redirecionada, ufw bloqueando ou CGNAT | refaça as etapas 0, 3 e 4; teste as portas TCP em `portchecker.co` com o nome do DuckDNS |
| Funciona fora de casa, mas não dos seus PCs de casa | roteador sem *NAT loopback* | nos seus PCs de casa, use o IP local do Ubuntu (`192.168.0.50`) como servidor de ID |
| "Key mismatch" / chave não confere | chave digitada errada ou servidor recriado | copie de novo o `id_ed25519.pub`; se a chave mudou, restaure o backup |
| Conecta, mas fica lento | a conexão caiu no relay e o upload da sua internet é baixo | normal em algumas redes; se for frequente, considere VPS |
| Parou do nada depois de dias | o IP da casa mudou e o DuckDNS não atualizou | `cat ~/duckdns/duck.log` deve mostrar `OK`; confira o `crontab -l` |

---

## Período de teste sugerido

Mantenha o AnyDesk ativo por 2 a 4 semanas usando o RustDesk com 2 ou 3 clientes. Se não houver
problema de conexão nem de velocidade, cancele o AnyDesk.

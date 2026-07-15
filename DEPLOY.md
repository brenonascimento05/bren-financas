# Deploy — Minhas Contas (PWA)

Guia passo a passo para testar localmente e publicar no seu cPanel.

## 1. Testar localmente antes de publicar

O app é 100% arquivos estáticos, mas **precisa** ser servido por um
mini-servidor HTTP (não abra o `index.html` com duplo-clique / `file://`,
pois os módulos ES (`type="module"`) e o Service Worker não funcionam
sob o protocolo `file://`).

Use qualquer uma destas opções, na pasta do projeto:

**Opção A — Python** (se tiver Python instalado):
```
python -m http.server 8000
```
Depois acesse `http://localhost:8000/` no navegador.

**Opção B — VS Code**: instale a extensão "Live Server" e clique em
"Go Live" com o `index.html` aberto.

**Opção C — PHP** (se tiver PHP instalado):
```
php -S localhost:8000
```

### Checklist de teste manual
- [ ] Tela "Contas" abre no mês atual, cards zerados (banco vazio)
- [ ] Criar uma saída avulsa pelo FAB (+) e ver aparecer na lista
- [ ] Criar uma conta fixa (aba "Nova") e conferir que já aparece no mês atual
- [ ] Criar uma parcelada (ex.: 3x) e conferir as 3 parcelas em meses seguintes
- [ ] Marcar/desmarcar "pago" e ver os totais do topo mudarem
- [ ] Navegar entre meses (‹ ›)
- [ ] Abrir "Dashboard" e ver os 3 gráficos (pizza, barras, linha)
- [ ] Abrir "Reserva", definir meta e adicionar valor guardado
- [ ] Em "Config", exportar XLSX e CSV e abrir os arquivos baixados
- [ ] Exportar backup JSON, apagar um lançamento, importar o backup e ver que ele volta
- [ ] No DevTools (F12) → Application → Service Workers, confirmar que o `sw.js` foi registrado
- [ ] No DevTools → Network, marcar "Offline" e recarregar a página — o app deve continuar funcionando

> Neste ambiente de desenvolvimento não havia Python/Node instalados nem
> permissão para abrir um servidor local, então a interface não pôde ser
> testada num navegador real por mim. Todo o código foi revisado
> manualmente com atenção (IDs de elementos, imports/exports entre
> módulos, schema do Dexie), mas faça o checklist acima antes de
> considerar o app pronto.

## 2. Criar o subdomínio no cPanel

1. cPanel → **Domínios** (ou "Subdomínios", a depender da versão) → criar subdomínio, ex.: `contas.seudominio.com.br`.
2. Aponte a pasta raiz (document root) para algo como `contas.seudominio.com.br` (o cPanel sugere automaticamente).
3. Aguarde a propagação de DNS (geralmente minutos, pode levar até algumas horas).

## 3. Ativar SSL (AutoSSL)

1. cPanel → **SSL/TLS Status** (ou **AutoSSL**).
2. Marque o subdomínio criado e clique em **Run AutoSSL** (ou aguarde a rotina automática, que roda periodicamente).
3. Confirme que o subdomínio abre com `https://` e cadeado verde antes de prosseguir — PWA (Service Worker) **exige HTTPS** (localhost é a única exceção).

## 4. Subir os arquivos via File Manager

1. Compacte localmente a pasta do projeto em um `.zip` (mais rápido que subir arquivo por arquivo):
   - Selecione todo o conteúdo *dentro* da pasta `meusistemacontas` (não a pasta em si) e compacte.
2. cPanel → **Gerenciador de Arquivos** → entre na pasta do subdomínio (ex.: `contas.seudominio.com.br`).
3. **Upload** → envie o `.zip`.
4. Clique com o botão direito no `.zip` enviado → **Extract** (Extrair).
5. Confirme que a estrutura ficou assim, direto na raiz do subdomínio:
   ```
   index.html
   manifest.json
   sw.js
   css/app.css
   js/*.js
   icons/icon-192.png
   icons/icon-512.png
   ```
6. Apague o `.zip` depois de extrair.

## 5. Proteger com Directory Privacy (opcional, mas pedido)

1. cPanel → **Privacidade de Diretórios** (Directory Privacy).
2. Navegue até a pasta do subdomínio e ative a proteção por senha (usuário/senha do `.htpasswd`).

**Atenção a uma limitação real:** Directory Privacy usa autenticação HTTP
Basic. Isso significa que, ao abrir o PWA instalado na tela inicial (que
roda em modo "standalone", sem a barra de endereço do Chrome), o
Android pode não exibir o prompt de usuário/senha da mesma forma que no
navegador normal, ou pode voltar a pedir login depois de reiniciar o
app. Teste bem esse fluxo especificamente:
- Instalar o PWA com o site já protegido
- Fechar o app completamente e reabrir pela tela inicial
- Testar o funcionamento **offline** com o site protegido

Se isso causar travamento no acesso offline, alternativas mais amigáveis
com um PWA instalado, já que os dados são 100% locais e o maior risco é
alguém adivinhar a URL:
- Usar um subdomínio com nome não-óbvio (ex.: algo aleatório) em vez de senha
- ou manter a Directory Privacy apenas se você sempre acessar com internet disponível

## 6. Instalar o PWA no Android

1. Abra `https://contas.seudominio.com.br` no **Chrome** do celular.
2. Menu (⋮) → **Adicionar à tela inicial** (ou o banner automático "Instalar app" pode aparecer).
3. Confirme o nome e toque em **Adicionar**.
4. Abra pelo ícone criado — o app abre em tela cheia, sem barra do navegador.
5. Ative o modo avião e confirme que o app ainda abre e funciona (prova de que o cache offline está ativo).

## 7. Atualizando o app no futuro

Sempre que alterar qualquer arquivo (HTML/CSS/JS) e subir a nova versão:

1. Abra `sw.js` e aumente a versão do cache, ex.:
   ```js
   const CACHE_NAME = 'financas-cache-v2'; // era v1
   ```
2. Suba os arquivos alterados normalmente.
3. Da próxima vez que o usuário abrir o app (com internet), o Service Worker novo é baixado, ele apaga o cache antigo (`v1`) e guarda os arquivos novos (`v2`).
4. Pode ser necessário fechar e reabrir o app duas vezes para o Android trocar de fato para a versão nova (comportamento normal de Service Worker).

## 8. Backup

Os dados ficam **só no navegador daquele celular** (IndexedDB). Trocar de
aparelho, limpar dados do Chrome ou desinstalar o app apaga tudo. Use o
botão **Exportar backup (JSON)** em Config regularmente — o próprio app
mostra um aviso quando o último backup passa de 30 dias.

ALBUQUERQUE CONSULTORIA MEI DAS - PUBLICACAO FINAL

Arquivos para publicar:
- index.html
- painel/index.html
- api/state.php
- app-state.json

Arquivo opcional para teste local:
- local-server.js

Estrutura esperada no servidor:
- /public_html/index.html
- /public_html/painel/index.html
- /public_html/api/state.php
- /public_html/app-state.json

URL final esperada:
- Site principal: https://albuquerqueconsultoriameidas.com/
- Painel: https://albuquerqueconsultoriameidas.com/painel/

DNS:
- A     @     2.57.91.91
- CNAME www   albuquerqueconsultoriameidas.com

Nameservers:
- Se o site vai ficar hospedado na mesma conta da Hostinger, mantenha:
  - apollo.dns-parking.com
  - athena.dns-parking.com

Publicacao:
1. Entre no Gerenciador de Arquivos da hospedagem.
2. Abra a pasta public_html.
3. Envie index.html para dentro de public_html.
4. Crie a pasta painel dentro de public_html.
5. Envie painel/index.html para dentro de public_html/painel.
6. Crie a pasta api dentro de public_html.
7. Envie api/state.php para dentro de public_html/api.
8. Envie app-state.json para dentro de public_html.
9. Se existir index.html antigo, substitua.

Observacoes:
- O painel nao usa subdominio. Ele abre em /painel/.
- O modo manutencao e a pagina principal sao controlados globalmente pelo painel.
- A hospedagem precisa ter PHP ativo para a rota /api/state.php funcionar.
- O pagamento Pix atual funciona como fluxo visual no frontend e usa a chave configurada no projeto.

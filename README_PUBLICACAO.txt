ALBUQUERQUE CONSULTORIA MEI DAS - PUBLICACAO FINAL

Arquivos para publicar:
- index.html
- painel/index.html

Arquivo opcional para teste local:
- local-server.js

Estrutura esperada no servidor:
- /public_html/index.html
- /public_html/painel/index.html

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
6. Se existir index.html antigo, substitua.

Observacoes:
- O painel nao usa subdominio. Ele abre em /painel/.
- O modo manutencao e a pagina principal sao controlados pelo painel.
- O pagamento Pix atual funciona como fluxo visual no frontend e usa a chave configurada no projeto.

ALBUQUERQUE CONSULTORIA MEI DAS - PUBLICACAO FINAL VERCEL

Arquivos principais do projeto:
- index.html
- painel/index.html
- api/state.js
- app-state.json
- vercel.json
- package.json

Uso local:
1. Rode `npm install`
2. Rode `npm run dev`
3. Acesse:
- Site principal: http://127.0.0.1:8080/
- Painel: http://127.0.0.1:8080/painel/

Publicacao na Vercel:
1. Envie este projeto para o GitHub.
2. Importe o repositório na Vercel.
3. No projeto da Vercel, abra Storage.
4. Crie um Blob Store.
5. Conecte o Blob Store ao projeto.
6. Confirme que a variavel `BLOB_READ_WRITE_TOKEN` foi criada no ambiente Production.
7. Se quiser, crie tambem:
- `STATE_BLOB_PATH=pgmei/app-state.json`
- `STATE_BLOB_ACCESS=private`
8. Faça um novo deploy.

Rotas finais esperadas:
- Site principal: https://www.albuquerqueconsultoriameidas.com/
- Painel: https://www.albuquerqueconsultoriameidas.com/painel
- API: https://www.albuquerqueconsultoriameidas.com/api/state?action=get

Comportamento do painel:
- Login fixo: `macaco`
- Senha fixa: `macaquinhoronald`
- Sessao continua logada apos `F5`
- Botao de manutencao altera o estado global do site
- Acessos, cliques, logins e geracao de Pix ficam persistidos no Blob

Observacoes importantes:
- Na Vercel, nao use `state.php`. O projeto agora usa `api/state.js`.
- O estado global nao depende mais de arquivo gravavel no servidor.
- `app-state.json` continua no projeto apenas para desenvolvimento local.
- Se a API responder erro de configuracao, revise se o Blob foi realmente conectado ao projeto e se o deploy mais recente recebeu a variavel `BLOB_READ_WRITE_TOKEN`.

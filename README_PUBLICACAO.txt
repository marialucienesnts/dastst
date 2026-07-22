ALBUQUERQUE CONSULTORIA MEI DAS - PUBLICACAO COM SUPABASE

Arquivos principais:
- index.html
- login/index.html
- oficial/index.html
- manutencao/index.html
- painel/index.html
- assets/app-common.js
- assets/painel.js
- assets/supabase-config.js
- supabase/schema.sql

Uso local:
1. Rode `npm install`
2. Rode `npm run dev`
3. Acesse:
- Site principal: http://127.0.0.1:8080/
- Painel: http://127.0.0.1:8080/painel/

Observacao local:
- Sem configurar o Supabase, o projeto entra em modo local.
- Nesse modo, painel e site compartilham estado apenas no mesmo navegador.
- Depois de preencher `assets/supabase-config.js`, o comportamento passa a ser global para todos.

Configuracao do Supabase:
1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Rode o script de `supabase/schema.sql`.
4. Copie a `Project URL`.
5. Copie a `anon public key`.
6. Edite `assets/supabase-config.js` e preencha:
- `url`
- `anonKey`

Rotas finais esperadas:
- Site principal: https://www.albuquerqueconsultoriameidas.com/
- Login: https://www.albuquerqueconsultoriameidas.com/login/
- Area oficial: https://www.albuquerqueconsultoriameidas.com/oficial/
- Manutencao: https://www.albuquerqueconsultoriameidas.com/manutencao/
- Painel: https://www.albuquerqueconsultoriameidas.com/painel

Comportamento do painel:
- Login fixo: `macaco`
- Senha fixa: `macaquinhoronald`
- Sessao continua logada apos `F5`
- Botao de manutencao altera o estado global do site
- Acessos, cliques, logins e geracao de Pix ficam salvos no Supabase

Observacoes:
- O projeto nao depende mais de `/api/state`.
- Os arquivos `api/state.js` e `app-state.json` podem continuar no projeto para historico e testes locais, mas a versao atual usa Supabase.
- Se quiser que todos os aparelhos vejam a manutencao ao mesmo tempo, o `assets/supabase-config.js` precisa estar preenchido com o projeto real.

# Urna Brasil 2026 — simulação educacional
Projeto independente, **não oficial**, sem vínculo com o TSE. Não é pesquisa de intenção de voto e não produz resultados eleitorais válidos.

## Usar
- Código publicado no GitHub. Site estático sem build: publique a raiz no Netlify.
- Mobile-first: Android, iPhone e desktop. Digite **22** (Flávio Bolsonaro), **13** (Lula); voto branco disponível.
- Som de teclado e confirmação: carregados de `JohnPetros/urna-eletronica/public/audios`, sob licença MIT. Para operação offline, copie os WAV originais para `audios/` e altere `AUDIO_BASE`.
- Retratos de Flávio Bolsonaro (Wikimedia Commons) e Lula (imagem da BBC), conforme URLs fornecidas. Imagens externas podem falhar; respeite os direitos de uso e atribuições das fontes.
- O gráfico mostra **apenas participações nesta simulação**, nunca votos oficiais.

## Google Sheets + Netlify (configurado no código; implantação ainda necessária)
- O Apps Script usa a planilha `Urna Eletronica`. As abas `Cadastros`, `Votos` e `Resumo` já foram preparadas.
- URL fornecida está no arquivo `netlify/functions/urna-api.mjs` (Google Apps Script `/exec`).
- O frontend usa `/.netlify/functions/urna-api` (mesma origem). Isso evita problemas de CORS no Android/iPhone.
- Publique o repositório no Netlify conectado ao GitHub, usando `netlify.toml` (site estático, Netlify Functions).
- Se não existir implantação vinculada, conecte o repositório em Netlify **Add new project → Import from Git**.
- Para ativar proteção contra voto duplicado: na planilha, **Extensões → Apps Script → Code.gs**; cole o conteúdo atualizado de `google-apps-script/Code.gs`, salve, execute `setupSheets`, autorize e publique **uma nova versão** na implantação Web App existente.
- Uma pessoa que tentar se cadastrar depois de já ter votado com o mesmo nome + nascimento verá **"Toma vergonha voce ja votou"**. Diferenças de maiúsculas, acentos e espaços são normalizadas. Se o primeiro cadastro não foi concluído, a pessoa pode retomá-lo e o token anterior é invalidado.
- A proteção é baseada em dados autodeclarados e **não verifica a identidade real**. Não é uma urna eleitoral segura, nem garante voto único por pessoa.
- **Loading minimalista animado (`loading.gif`)** aparece automaticamente durante cadastro, voto e atualização de resultados. Cliques repetidos são bloqueados e requisições expiram se demorarem demais.
- Teste no Netlify a conexão com Google Sheets, cadastro, voto, segundo cadastro idêntico e gráfico; validações de implantação e dispositivos ainda não foram concluídas.

### Privacidade
Não compartilhe a planilha de forma pública. Nome, nascimento e participação em simulação política são dados pessoais; informe finalidade, prazo de retenção e exclusão, proteja as informações e permita que participantes retirem seus dados. Os dados identificáveis ficam em `Cadastros`; os números escolhidos ficam em `Votos`. A separação por aba **não garante anonimato**, pois horários podem permitir correlação. Não use os números da simulação como pesquisa eleitoral real.

## Créditos
Inspirado em [JohnPetros/urna-eletronica](https://github.com/JohnPetros/urna-eletronica), Copyright (c) 2023 João Pedro Carvalho (MIT). Ver [licença original](https://github.com/JohnPetros/urna-eletronica/blob/main/LICENSE). Esta é uma adaptação independente e **não uma clonagem completa** do código original.

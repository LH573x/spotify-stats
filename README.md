# Lyra

Site para explorar o histórico completo de escuta do Spotify: horas, artistas, músicas, podcasts e como tudo isso mudou ao longo dos anos.

Os arquivos do export são lidos **no próprio navegador**. O histórico não é enviado para servidor nenhum, e nenhum dado pessoal fica neste repositório. Para mostrar fotos de artistas e capas de álbuns, o site procura só os nomes que aparecem na tela no [Wikidata](https://www.wikidata.org/) e no [MusicBrainz](https://musicbrainz.org/), e guarda o resultado no navegador.

## Como usar

1. Peça seus dados em [spotify.com → Conta → Privacidade](https://www.spotify.com/account/privacy/), marcando **Histórico de streaming estendido**.
2. Quando o e-mail chegar, baixe o `my_spotify_data.zip`.
3. Abra o site e solte o zip (ou os arquivos `.json`) na página inicial.

Funciona com o histórico estendido (`Streaming_History_Audio_*.json`) e com o básico (`StreamingHistory_music_*.json`, `StreamingHistory_podcast_*.json`).

## Páginas

| Página | Status |
| --- | --- |
| Resumo: horas, top artistas e músicas, horas por mês | pronta |
| Curiosidades: calendário, relógio de escuta, plataformas, aleatório e músicas puladas | pronta |
| Linha do tempo: top 5 de cada ano, descobertas, fases e busca | pronta |
| Artista: horas por mês, posição em cada ano, músicas mais ouvidas | pronta |
| Wrapped: stories para o Instagram (Top 5 do último mês, do último ano e desde sempre, e a retrospectiva de cada ano), para baixar ou compartilhar | pronta |

## Desenvolvimento

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera o site em dist/
npm run lint
```

Feito com React, TypeScript, Vite e Apache ECharts. A cada push na `main`, o GitHub Actions publica o site no GitHub Pages.

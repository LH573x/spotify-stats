# Meu Spotify

Site para explorar o histórico completo de escuta do Spotify: horas, artistas, músicas, podcasts e como tudo isso mudou ao longo dos anos.

Os arquivos do export são lidos **no próprio navegador**. Nada é enviado para servidor nenhum, e nenhum dado pessoal fica neste repositório.

## Como usar

1. Peça seus dados em [spotify.com → Conta → Privacidade](https://www.spotify.com/account/privacy/), marcando **Histórico de streaming estendido**.
2. Quando o e-mail chegar, baixe o `my_spotify_data.zip`.
3. Abra o site e solte o zip (ou os arquivos `.json`) na página inicial.

Funciona com o histórico estendido (`Streaming_History_Audio_*.json`) e com o básico (`StreamingHistory_music_*.json`, `StreamingHistory_podcast_*.json`).

## Páginas

| Página | Status |
| --- | --- |
| Resumo: horas, top artistas e músicas, horas por mês | pronta |
| Hábitos: calendário, relógio de escuta, plataformas, skips | em breve |
| Linha do tempo: ranking por ano, descobertas, fases | em breve |
| Artista | em breve |
| Wrapped: cartões para compartilhar | em breve |

## Desenvolvimento

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera o site em dist/
npm run lint
```

Feito com React, TypeScript, Vite e Apache ECharts. A cada push na `main`, o GitHub Actions publica o site no GitHub Pages.

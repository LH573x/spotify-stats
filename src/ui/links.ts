/** Endereço da página de um artista (ou podcast). */
export const artistHref = (id: number) => `#artista-${id}`

/** Endereço da página de uma música (ou episódio). */
export const songHref = (id: number) => `#musica-${id}`

/** Endereço da página de uma playlist (posição dela no pacote "Dados da conta"). */
export const playlistHref = (index: number) => `#playlist-${index}`

import { onAstroPageLoad, onDomReady } from '../../scripts/client/runtime'

type TrackListMessages = {
  albumTitle: string
  albumArtist: string
  coverUrl: string | null
  noPreviewForTrackLabel: string
  playPreviewTemplate: string
  pausePreviewTemplate: string
  muteLabel: string
  unmuteLabel: string
  closeLabel: string
  previewsUnavailableLabel: string
  loadPreviewErrorLabel: string
}

function getMessages(): TrackListMessages {
  const fallback: TrackListMessages = {
    albumTitle: '',
    albumArtist: '',
    coverUrl: null,
    noPreviewForTrackLabel: 'No preview available for this track',
    playPreviewTemplate: 'Play preview of {name}',
    pausePreviewTemplate: 'Pause preview of {name}',
    muteLabel: 'Mute',
    unmuteLabel: 'Unmute',
    closeLabel: 'Close',
    previewsUnavailableLabel: 'Audio previews are unavailable.',
    loadPreviewErrorLabel: 'Error while loading preview',
  }

  const element = document.getElementById('tracklist-messages')
  if (!element?.textContent) return fallback
  try {
    const parsed = JSON.parse(element.textContent) as Partial<TrackListMessages>
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

function initTrackList(): void {
  const tracklist = document.querySelector('[data-tracklist]')
  if (!(tracklist instanceof HTMLElement)) return
  if (tracklist.dataset.initialized === 'true') return
  tracklist.dataset.initialized = 'true'

  const messages = getMessages()
  const previewButtons = Array.from(tracklist.querySelectorAll('.track-preview-btn')).filter(
    (element): element is HTMLButtonElement => element instanceof HTMLButtonElement
  )

  let deezerEnabled = false
  let deezerCheckDone = false

  async function checkAudioAvailability(): Promise<boolean> {
    if (deezerCheckDone) return deezerEnabled
    try {
      await fetch('/api/deezer/search-track?artist=test&track=test')
      deezerEnabled = true
    } catch {
      deezerEnabled = false
    }
    deezerCheckDone = true

    if (!deezerEnabled) {
      previewButtons.forEach((button) => {
        button.style.display = 'none'
      })
      const tracklistHeader = tracklist.closest('.glass-card')
      if (tracklistHeader instanceof HTMLElement) {
        const infoMessage = document.createElement('div')
        infoMessage.className =
          'mt-4 rounded-lg border border-border bg-surface-elevated p-3 text-sm text-muted'
        const infoParagraph = document.createElement('p')
        infoParagraph.className = 'flex items-center gap-2'
        const infoIconWrap = document.createElement('span')
        infoIconWrap.className = 'inline-flex'
        infoIconWrap.innerHTML =
          '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
        infoParagraph.appendChild(infoIconWrap)
        infoParagraph.append(document.createTextNode(messages.previewsUnavailableLabel))
        infoMessage.appendChild(infoParagraph)
        tracklist.appendChild(infoMessage)
      }
    }
    return deezerEnabled
  }

  void checkAudioAvailability()

  const previewCache = new Map<string, string>()

  previewButtons.forEach((button) => {
    let hoverTimeout: ReturnType<typeof setTimeout> | null = null

    button.addEventListener('mouseenter', async () => {
      const isEnabled = await checkAudioAvailability()
      if (!isEnabled) return

      const trackName = button.dataset.trackName
      const trackArtist = button.dataset.trackArtist || messages.albumArtist
      if (!trackName) return

      const cacheKey = `${trackArtist}-${trackName}`
      hoverTimeout = setTimeout(async () => {
        if (previewCache.has(cacheKey)) return
        try {
          const searchResponse = await fetch(
            `/api/deezer/search-track?artist=${encodeURIComponent(trackArtist)}&track=${encodeURIComponent(trackName)}`
          )
          if (!searchResponse.ok) return
          const searchData = (await searchResponse.json()) as { track?: { preview_url?: string } }
          if (searchData.track?.preview_url) {
            previewCache.set(cacheKey, searchData.track.preview_url)
            const audio = new Audio(searchData.track.preview_url)
            audio.preload = 'metadata'
          }
        } catch {
          // noop
        }
      }, 300)
    })

    button.addEventListener('mouseleave', () => {
      if (hoverTimeout) clearTimeout(hoverTimeout)
      hoverTimeout = null
    })

    button.addEventListener('click', async () => {
      const isEnabled = await checkAudioAvailability()
      if (!isEnabled) {
        window.toast?.info(messages.previewsUnavailableLabel)
        return
      }

      const trackName = button.dataset.trackName
      const trackArtist = button.dataset.trackArtist || messages.albumArtist
      const trackIndex = button.dataset.trackIndex
      const container = button.closest('[data-preview-container]')
      const playIcon = button.querySelector('[data-play-icon]')
      const loadingIcon = button.querySelector('[data-loading-icon]')

      if (!(container instanceof HTMLElement) || !trackName) return

      const existingPlayer = container.querySelector('.audio-player')
      if (existingPlayer instanceof HTMLElement) {
        const existingAudio = existingPlayer.querySelector('audio')
        if (existingAudio instanceof HTMLAudioElement) {
          existingAudio.pause()
          existingAudio.currentTime = 0
        }
        existingPlayer.remove()
      }

      if (playIcon instanceof HTMLElement) playIcon.classList.add('hidden')
      if (loadingIcon instanceof HTMLElement) loadingIcon.classList.remove('hidden')
      button.disabled = true

      try {
        const cacheKey = `${trackArtist}-${trackName}`
        let previewUrl = previewCache.get(cacheKey)

        if (!previewUrl) {
          const searchResponse = await fetch(
            `/api/deezer/search-track?artist=${encodeURIComponent(trackArtist)}&track=${encodeURIComponent(trackName)}`
          )
          if (!searchResponse.ok) throw new Error('Failed to search track')
          const searchData = (await searchResponse.json()) as { track?: { preview_url?: string } }
          if (!searchData.track?.preview_url) {
            window.toast?.info(messages.noPreviewForTrackLabel)
            if (playIcon instanceof HTMLElement) playIcon.classList.remove('hidden')
            if (loadingIcon instanceof HTMLElement) loadingIcon.classList.add('hidden')
            button.disabled = false
            return
          }
          previewUrl = searchData.track.preview_url
          previewCache.set(cacheKey, previewUrl)
        }

        const globalBar = document.getElementById('global-audio-bar')
        const globalSlot = globalBar?.querySelector('[data-global-audio-slot]')
        const useGlobalBar = Boolean(globalSlot)

        const playerWrapper = document.createElement('div')
        playerWrapper.className = useGlobalBar ? '' : 'mt-2'
        playerWrapper.innerHTML = `
          <div class="audio-player flex items-center gap-2 md:gap-3" data-player-id="track-${trackIndex}" data-compact="true">
            <div class="flex flex-1 items-center gap-2 min-w-0 rounded-lg border-0 bg-transparent p-0 md:gap-3 md:rounded-lg md:border md:border-border md:bg-surface md:p-2">
              ${messages.coverUrl ? `<img src="${messages.coverUrl}" alt="${trackName}" class="h-10 w-10 shrink-0 rounded object-cover" />` : ''}
              <div class="flex-1 min-w-0">
                <p class="truncate text-sm font-medium text-neutral">${trackName}</p>
                <p class="truncate text-xs text-muted">${trackArtist}</p>
              </div>
              <button type="button" class="audio-play-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-all hover:bg-primary/90" data-action="play-pause" data-play-label="${messages.playPreviewTemplate.replace('{name}', trackName)}" data-pause-label="${messages.pausePreviewTemplate.replace('{name}', trackName)}" aria-label="${messages.playPreviewTemplate.replace('{name}', trackName)}">
                <svg class="audio-play-icon h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg class="audio-pause-icon h-4 w-4 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <audio id="track-${trackIndex}" class="hidden" preload="none" data-preview-url="${previewUrl}" data-auto-play="true"></audio>
            </div>
          </div>
        `

        if (useGlobalBar) {
          const audioPlayerDiv = playerWrapper.querySelector('.audio-player')
          if (audioPlayerDiv instanceof HTMLElement) {
            const closeButton = document.createElement('button')
            closeButton.type = 'button'
            closeButton.className =
              'global-audio-close flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-neutral'
            closeButton.setAttribute('aria-label', messages.closeLabel)
            closeButton.innerHTML =
              '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>'
            audioPlayerDiv.appendChild(closeButton)
          }
        }

        if (globalSlot instanceof HTMLElement && globalBar instanceof HTMLElement) {
          globalSlot.innerHTML = ''
          globalSlot.appendChild(playerWrapper)
          globalBar.classList.remove('hidden')
          document.body.classList.add('has-global-audio')
          const closeButton = playerWrapper.querySelector('.global-audio-close')
          if (closeButton instanceof HTMLElement) {
            closeButton.addEventListener('click', () => {
              const audioElement = playerWrapper.querySelector('audio')
              if (audioElement instanceof HTMLAudioElement && !audioElement.paused) audioElement.pause()
              globalSlot.innerHTML = ''
              globalBar.classList.add('hidden')
              document.body.classList.remove('has-global-audio')
            })
          }
        } else {
          container.appendChild(playerWrapper)
        }

        const audio = playerWrapper.querySelector('audio')
        const playButton = playerWrapper.querySelector('[data-action="play-pause"]')
        const playerPlayIcon = playerWrapper.querySelector('.audio-play-icon')
        const playerPauseIcon = playerWrapper.querySelector('.audio-pause-icon')

        if (audio instanceof HTMLAudioElement && playButton instanceof HTMLButtonElement) {
          audio.src = previewUrl

          document.querySelectorAll('audio').forEach((otherAudio) => {
            if (otherAudio instanceof HTMLAudioElement && otherAudio !== audio && !otherAudio.paused) {
              otherAudio.pause()
              otherAudio.currentTime = 0
            }
          })

          playButton.addEventListener('click', () => {
            if (audio.paused) {
              void audio.play().catch((error) => console.error('Error playing audio:', error))
              if (playerPlayIcon instanceof HTMLElement) playerPlayIcon.classList.add('hidden')
              if (playerPauseIcon instanceof HTMLElement) playerPauseIcon.classList.remove('hidden')
              if (playButton.dataset.pauseLabel) playButton.setAttribute('aria-label', playButton.dataset.pauseLabel)
            } else {
              audio.pause()
              if (playerPlayIcon instanceof HTMLElement) playerPlayIcon.classList.remove('hidden')
              if (playerPauseIcon instanceof HTMLElement) playerPauseIcon.classList.add('hidden')
              if (playButton.dataset.playLabel) playButton.setAttribute('aria-label', playButton.dataset.playLabel)
            }
          })

          audio.addEventListener('ended', () => {
            if (playerPlayIcon instanceof HTMLElement) playerPlayIcon.classList.remove('hidden')
            if (playerPauseIcon instanceof HTMLElement) playerPauseIcon.classList.add('hidden')
          })

          setTimeout(() => {
            void audio.play().catch((error) => console.error('Error auto-playing audio:', error))
            if (playerPlayIcon instanceof HTMLElement) playerPlayIcon.classList.add('hidden')
            if (playerPauseIcon instanceof HTMLElement) playerPauseIcon.classList.remove('hidden')
          }, 100)
        }

        button.style.display = 'none'
      } catch (error) {
        console.error('Error loading preview:', error)
        window.toast?.error(messages.loadPreviewErrorLabel)
        if (playIcon instanceof HTMLElement) playIcon.classList.remove('hidden')
        if (loadingIcon instanceof HTMLElement) loadingIcon.classList.add('hidden')
        button.disabled = false
      }
    })
  })
}

onDomReady(initTrackList)
onAstroPageLoad(initTrackList)


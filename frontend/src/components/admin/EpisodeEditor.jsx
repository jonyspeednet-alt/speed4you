function EpisodeEditor({ formData, episodesExpanded, setEpisodesExpanded, handleSeasonChange, handleEpisodeChange, autoResize, styles }) {
  return formData.type === 'series' && Array.isArray(formData.seasons) && formData.seasons.length > 0 && (
    <section id="section-episodes" data-section style={styles.section}>
      <div style={styles.sectionHeader}>
        <span style={styles.sectionEyebrow}>Episode Media Control</span>
        <button type="button" onClick={() => setEpisodesExpanded(!episodesExpanded)}
          style={styles.collapseBtn}>
          {episodesExpanded ? '▲ Collapse' : '▼ Episodes'}
        </button>
      </div>
      <div style={{ display: episodesExpanded ? 'grid' : 'none', gap: '16px' }}>
        <div style={styles.infoBox}>
          Manual override from here will save episode-specific Media URL, so each episode can point to its own file.
        </div>

        <div style={styles.seasonEditorStack}>
          {formData.seasons.map((season, seasonIndex) => (
            <div key={season.id || seasonIndex} style={styles.seasonCard}>
              <div style={styles.seasonHeader}>
                <strong style={styles.seasonTitle}>Season {season.number || seasonIndex + 1}</strong>
                <span style={styles.seasonMeta}>{(season.episodes || []).length} episodes</span>
              </div>

              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Season Title Override</label>
                  <input
                    type="text"
                    value={season.title || ''}
                    onChange={(event) => handleSeasonChange(seasonIndex, 'title', event.target.value)}
                    style={styles.input}
                    placeholder={`Season ${season.number || seasonIndex + 1}`}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Season Poster</label>
                  <input
                    type="text"
                    value={season.poster || ''}
                    onChange={(event) => handleSeasonChange(seasonIndex, 'poster', event.target.value)}
                    style={styles.input}
                    placeholder="Optional season poster URL"
                  />
                </div>
              </div>

              <div style={styles.episodeEditorList}>
                {(season.episodes || []).map((episode, episodeIndex) => (
                  <div key={episode.id || `${seasonIndex}-${episodeIndex}`} style={styles.episodeEditorCard}>
                    <div style={styles.episodeEditorHeader}>
                      <strong>Episode {episode.number || episodeIndex + 1}</strong>
                      <small style={styles.episodeEditorHint}>{episode.sourcePath || 'No source path found'}</small>
                    </div>

                    <div style={styles.row}>
                      <div style={styles.field}>
                        <label style={styles.label}>Episode Title</label>
                        <input
                          type="text"
                          value={episode.title || ''}
                          onChange={(event) => handleEpisodeChange(seasonIndex, episodeIndex, 'title', event.target.value)}
                          style={styles.input}
                          placeholder={`Episode ${episode.number || episodeIndex + 1}`}
                        />
                      </div>

                      <div style={styles.field}>
                        <label style={styles.label}>Media URL</label>
                        <input
                          type="text"
                          value={episode.videoUrl || ''}
                          onChange={(event) => handleEpisodeChange(seasonIndex, episodeIndex, 'videoUrl', event.target.value)}
                          style={styles.input}
                          placeholder="/Series/Season 1/Episode 01.mkv"
                        />
                      </div>
                    </div>

                    <div style={styles.field}>
                      <label style={styles.label}>Episode Description</label>
                      <textarea
                        value={episode.description || ''}
                        onChange={(event) => handleEpisodeChange(seasonIndex, episodeIndex, 'description', event.target.value)}
                        onInput={(e) => autoResize(e.target)}
                        style={styles.textarea}
                        rows={2}
                        placeholder="Optional episode notes"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default EpisodeEditor;

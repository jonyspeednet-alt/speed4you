import { useState, useCallback } from 'react';

function EpisodeEditor({ formData, episodesExpanded, setEpisodesExpanded, handleSeasonChange, handleEpisodeChange, onBatchSetUrls, onMoveEpisode, autoResize, styles }) {
  const [batchPattern, setBatchPattern] = useState('');

  const handleBatchApply = useCallback(() => {
    if (!batchPattern || !onBatchSetUrls) return;
    onBatchSetUrls(batchPattern);
    setBatchPattern('');
  }, [batchPattern, onBatchSetUrls]);

  if (!(formData.type === 'series' && Array.isArray(formData.seasons) && formData.seasons.length > 0)) return null;

  return (
    <section id="section-episodes" data-section style={styles.section}>
      <div style={styles.sectionHeader}>
        <span style={styles.sectionEyebrow}>Episode Media Control</span>
        <button type="button" onClick={() => setEpisodesExpanded(!episodesExpanded)}
          aria-expanded={episodesExpanded}
          style={styles.collapseBtn}>
          {episodesExpanded ? '▲ Collapse' : '▼ Episodes'}
        </button>
      </div>
      <div style={{ display: episodesExpanded ? 'grid' : 'none', gap: '6px' }} aria-hidden={!episodesExpanded}>
        <div style={styles.infoBox}>
          Manual override from here will save episode-specific Media URL, so each episode can point to its own file.
        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ ...styles.field, flex: 1, minWidth: '180px' }}>
            <label style={styles.label}>Batch Set Episode URLs</label>
            <input
              type="text"
              value={batchPattern}
              onChange={(e) => setBatchPattern(e.target.value)}
              style={styles.input}
              placeholder="/Series/Name/S01E{NN}.mkv"
            />
          </div>
          <button type="button" onClick={handleBatchApply} disabled={!batchPattern} style={styles.secondaryBtn}>
            Apply to All
          </button>
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-3, #475569)', marginTop: '-2px' }}>
          Use {'{NN}'} for auto-numbered episodes (01, 02, ...), {'{N}'} for 1, 2, ...
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '6px' }}>
                      <div style={styles.episodeEditorHeader}>
                        <strong>Episode {episode.number || episodeIndex + 1}</strong>
                        <small style={styles.episodeEditorHint}>{episode.sourcePath || 'No source path found'}</small>
                      </div>
                      {onMoveEpisode && (
                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                          <button
                            type="button"
                            disabled={episodeIndex === 0}
                            onClick={() => onMoveEpisode(seasonIndex, episodeIndex, episodeIndex - 1)}
                            style={{ ...styles.collapseBtn, fontSize: '0.65rem', padding: '2px 5px', opacity: episodeIndex === 0 ? 0.3 : 1 }}
                            aria-label="Move episode up"
                          >&#9650;</button>
                          <button
                            type="button"
                            disabled={episodeIndex === (season.episodes || []).length - 1}
                            onClick={() => onMoveEpisode(seasonIndex, episodeIndex, episodeIndex + 1)}
                            style={{ ...styles.collapseBtn, fontSize: '0.65rem', padding: '2px 5px', opacity: episodeIndex === (season.episodes || []).length - 1 ? 0.3 : 1 }}
                            aria-label="Move episode down"
                          >&#9660;</button>
                        </div>
                      )}
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
                        rows={1}
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

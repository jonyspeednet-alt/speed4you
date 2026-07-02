import { useState, useCallback } from 'react';

function EpisodeEditor({ formData, episodesExpanded, setEpisodesExpanded, handleSeasonChange, handleEpisodeChange, onBatchSetUrls, onMoveEpisode, autoResize, styles: S }) {
  const [batchPattern, setBatchPattern] = useState('');

  const handleBatchApply = useCallback(() => {
    if (!batchPattern || !onBatchSetUrls) return;
    onBatchSetUrls(batchPattern);
    setBatchPattern('');
  }, [batchPattern, onBatchSetUrls]);

  if (!(formData.type === 'series' && Array.isArray(formData.seasons) && formData.seasons.length > 0)) return null;

  const totalEps = formData.seasons.reduce((s, seas) => s + (seas.episodes || []).length, 0);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={S.sectionEyebrow}>Episodes ({totalEps})</span>
        <button type="button" onClick={() => setEpisodesExpanded(!episodesExpanded)} style={S.collapseBtn}>
          {episodesExpanded ? '▲ Hide' : '▼ Show'}
        </button>
      </div>

      {episodesExpanded && (
        <div style={{ display: 'grid', gap: '3px' }}>
          <div style={{ display: 'flex', gap: '3px', alignItems: 'end' }}>
            <div style={{ ...S.field, flex: 1 }}>
              <input type="text" value={batchPattern} onChange={(e) => setBatchPattern(e.target.value)}
                style={S.input} placeholder="Batch: /Series/S01E{NN}.mkv" />
            </div>
            <button type="button" onClick={handleBatchApply} disabled={!batchPattern} style={S.secondaryBtn}>Apply All</button>
          </div>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-3, #475569)', marginTop: '-2px' }}>
            {'{NN}'} = 01,02.. {'{N}'} = 1,2..
          </div>

          <div style={S.seasonEditorStack}>
            {formData.seasons.map((season, si) => (
              <div key={season.id || si} style={S.seasonCard}>
                <div style={S.seasonHeader}>
                  <strong style={S.seasonTitle}>S{season.number || si + 1}</strong>
                  <span style={S.seasonMeta}>{(season.episodes || []).length} eps</span>
                  <span style={{ display: 'flex', gap: '3px' }}>
                    <input type="text" value={season.title || ''} onChange={(e) => handleSeasonChange(si, 'title', e.target.value)}
                      style={{ ...S.input, width: '120px', fontSize: '0.6rem', padding: '1px 4px' }} placeholder="Title" />
                    <input type="text" value={season.poster || ''} onChange={(e) => handleSeasonChange(si, 'poster', e.target.value)}
                      style={{ ...S.input, width: '100px', fontSize: '0.6rem', padding: '1px 4px' }} placeholder="Poster URL" />
                  </span>
                </div>

                <div style={S.episodeEditorList}>
                  {(season.episodes || []).map((ep, ei) => (
                    <div key={ep.id || `${si}-${ei}`} style={S.episodeEditorCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0, flex: 1 }}>
                          <strong style={{ fontSize: '0.6rem', whiteSpace: 'nowrap', color: 'var(--text, #f1f5f9)' }}>E{ep.number || ei + 1}</strong>
                          <span style={S.episodeEditorHint}>{ep.sourcePath || '-'}</span>
                        </div>
                        {onMoveEpisode && (
                          <span style={{ display: 'flex', gap: '1px', flexShrink: 0 }}>
                            <button type="button" disabled={ei === 0}
                              onClick={() => onMoveEpisode(si, ei, ei - 1)}
                              style={{ ...S.collapseBtn, opacity: ei === 0 ? 0.3 : 1 }} aria-label="Move up">▲</button>
                            <button type="button" disabled={ei === (season.episodes || []).length - 1}
                              onClick={() => onMoveEpisode(si, ei, ei + 1)}
                              style={{ ...S.collapseBtn, opacity: ei === (season.episodes || []).length - 1 ? 0.3 : 1 }} aria-label="Move down">▼</button>
                          </span>
                        )}
                      </div>

                      <div style={S.row2}>
                        <input type="text" value={ep.title || ''} onChange={(e) => handleEpisodeChange(si, ei, 'title', e.target.value)}
                          style={{ ...S.input, fontSize: '0.6rem', padding: '1px 4px' }} placeholder={`Ep ${ep.number || ei + 1}`} />
                        <input type="text" value={ep.videoUrl || ''} onChange={(e) => handleEpisodeChange(si, ei, 'videoUrl', e.target.value)}
                          style={{ ...S.input, fontSize: '0.6rem', padding: '1px 4px' }} placeholder="Media URL" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default EpisodeEditor;

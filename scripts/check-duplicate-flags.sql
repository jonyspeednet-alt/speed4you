SELECT count(1) as total, count(case when duplicate_count > 0 then 1 end) as flagged_dups FROM content_catalog WHERE source_root_id='extra-storage-bangla-movies';
